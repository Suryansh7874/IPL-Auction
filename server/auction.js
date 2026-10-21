const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const Player = require('./models/Player');
const Team = require('./models/Team');
const Lineup = require('./models/Lineup');
const Match = require('./models/Match');

const STARTING_PURSE = 10000; // 100 Cr, same for every team

const BID_SECONDS = 20;
const MAX_SQUAD = 25;
const MAX_OVERSEAS = 8;

let io;
let timer = null;

const state = {
  status: 'idle', // 'idle' | 'live'
  ended: false,
  player: null,
  currentBid: 0,
  leader: null, // { teamId, name }
  endsAt: null,
  log: [],
  version: 0, // changes on every bid/start/finish, used to catch races
  lastResult: null,
};

// Bid steps get bigger as the price grows (values are in lakh)
function nextBidAmount() {
  if (!state.leader) return state.player.basePrice;
  const c = state.currentBid;
  const inc = c < 100 ? 5 : c < 200 ? 10 : c < 500 ? 20 : 25;
  return c + inc;
}

function publicState() {
  return {
    status: state.status,
    ended: state.ended,
    player: state.player,
    currentBid: state.currentBid,
    nextBid: state.player ? nextBidAmount() : null,
    leader: state.leader,
    endsAt: state.endsAt,
    log: state.log.slice(-15),
    lastResult: state.lastResult,
  };
}

const broadcast = () => io.emit('state', publicState());

function startTimer() {
  clearTimeout(timer);
  state.endsAt = Date.now() + BID_SECONDS * 1000;
  timer = setTimeout(finishPlayer, BID_SECONDS * 1000);
}

async function finishPlayer() {
  const p = state.player;
  const leader = state.leader;
  const price = state.currentBid;
  if (!p) return;

  // Reset synchronously so late bids are rejected immediately
  state.status = 'idle';
  state.player = null;
  state.leader = null;
  state.endsAt = null;
  state.currentBid = 0;
  state.version++;

  try {
    if (leader) {
      await Player.findByIdAndUpdate(p._id, { status: 'sold', soldTo: leader.teamId, soldPrice: price });
      await Team.findByIdAndUpdate(leader.teamId, { $inc: { purse: -price }, $push: { squad: p._id } });
      state.lastResult = { type: 'sold', player: p.name, team: leader.name, price };
    } else {
      await Player.findByIdAndUpdate(p._id, { status: 'unsold' });
      state.lastResult = { type: 'unsold', player: p.name };
    }
  } catch (err) {
    console.error('finishPlayer failed:', err.message);
  }
  broadcast();
  io.emit('refresh'); // clients re-fetch teams/players
}
// Clears the live player and stops the timer (used by end + restart)
function resetLive() {
  clearTimeout(timer);
  timer = null;
  state.status = 'idle';
  state.player = null;
  state.leader = null;
  state.endsAt = null;
  state.currentBid = 0;
  state.log = [];
  state.version++;
}
function init(httpServer) {
  io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL } });

  // Only logged-in users can connect
  io.use((socket, next) => {
    try {
      socket.user = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Not logged in'));
    }
  });

  io.on('connection', (socket) => {
    
    const fail = (msg) => socket.emit('error_msg', msg);
    socket.emit('state', publicState()); // full state on connect/reconnect

    // ---- Team places a bid (server decides the amount) ----
    socket.on('place_bid', async () => {
      if (state.ended) return fail('The auction has ended');
      if (socket.user.role !== 'team') return fail('Only teams can bid');
      if (state.status !== 'live') return fail('No player is live');
      if (state.leader?.teamId === String(socket.user.team)) return fail('You already have the highest bid');

      const amount = nextBidAmount();
      const version = state.version;
      const team = await Team.findById(socket.user.team).populate('squad', 'nationality');

      // Someone else may have bid (or time ended) while we were reading the DB
      if (state.status !== 'live' || state.version !== version) return fail('Too late, try again');
      if (team.purse < amount) return fail('Not enough purse');
      if (team.squad.length >= MAX_SQUAD) return fail('Squad is full (25)');
      const overseas = team.squad.filter((p) => p.nationality !== 'India').length;
      if (state.player.nationality !== 'India' && overseas >= MAX_OVERSEAS) {
        return fail('Overseas limit reached (8)');
      }

      state.currentBid = amount;
      state.leader = { teamId: String(team._id), name: team.shortName };
      state.log.push({ team: team.shortName, amount });
      state.version++;
      startTimer(); // every bid resets the clock
      broadcast();
    });

    // ---- Admin controls ----
    socket.on('admin:next', async () => {
      if (socket.user.role !== 'admin') return;
      if (state.ended) return fail('The auction has ended. Restart it to begin again.');
      if (state.status === 'live') return fail('A player is already live');
      const count = await Player.countDocuments({ status: 'available' });
      if (!count) return fail('No players left. Use "Re-auction unsold".');
      const p = await Player.findOne({ status: 'available' })
        .skip(Math.floor(Math.random() * count))
        .lean();
      if (state.status === 'live') return; // double click protection

      state.status = 'live';
      state.player = { ...p, _id: String(p._id) };
      state.currentBid = p.basePrice;
      state.leader = null;
      state.log = [];
      state.lastResult = null;
      state.version++;
      startTimer();
      broadcast();
    });

    socket.on('admin:reauction', async () => {
      if (socket.user.role !== 'admin') return;
      await Player.updateMany({ status: 'unsold' }, { status: 'available' });
      io.emit('refresh');
    });
        socket.on('admin:end', () => {
      if (socket.user.role !== 'admin') return;
      if (state.ended) return;
      resetLive(); // a live player is withdrawn and stays unsold
      state.ended = true;
      state.lastResult = { type: 'ended' };
      broadcast();
      io.emit('refresh');
    });

    socket.on('admin:restart', async () => {
      if (socket.user.role !== 'admin') return;
      resetLive();
      state.ended = false;
      state.lastResult = null;
      await Promise.all([
        Player.updateMany({}, { status: 'available', soldTo: null, soldPrice: 0 }),
        Team.updateMany({}, { purse: STARTING_PURSE, squad: [] }),
        Lineup.deleteMany({}),
        Match.deleteMany({}),
      ]);
      broadcast();
      io.emit('refresh');
    });
  });
}
function emitRefresh() {
  if (io) io.emit('refresh');
}

module.exports = { init, emitRefresh };
