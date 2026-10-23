const { Server } = require('socket.io');
const Player = require('./models/Player');
const Team = require('./models/Team');
const Lineup = require('./models/Lineup');
const Match = require('./models/Match');
const AuctionState = require('./models/AuctionState');
const { authenticate } = require('./middleware/auth');
const Tournament = require('./models/Tournament');

const BID_SECONDS = Number(process.env.BID_SECONDS) || 10; // har bid ke baad
const FIRST_BID_SECONDS = Number(process.env.FIRST_BID_SECONDS) || 15; // player aate hi
const MAX_SQUAD = 25;
const MAX_OVERSEAS = 8;
const { STARTING_PURSE } = require('./config');

let io;
let timer = null;

const state = {
  status: 'idle', // 'idle' | 'live'
  ended: false,
  player: null,
  currentBid: 0,
  leader: null, // { teamId, name }
  endsAt: null, // milliseconds
  log: [],
  version: 0, // har badlav par badhta hai (race conditions pakadne ke liye)
  lastResult: null,
};

// ---------- Database mein save / restore ----------
const snapshot = () => ({
  status: state.status,
  ended: state.ended,
  player: state.player,
  currentBid: state.currentBid,
  leader: state.leader,
  endsAt: state.endsAt ? new Date(state.endsAt) : null,
  log: state.log,
  version: state.version,
  lastResult: state.lastResult,
});

// Saari writes ek line mein, taaki order na bigde
let writeChain = Promise.resolve();
function persist() {
  const snap = snapshot();
  writeChain = writeChain
    .then(() => AuctionState.findOneAndUpdate({ key: 'main' }, snap, { upsert: true }))
    .catch((err) => console.error('Could not save auction state:', err.message));
  return writeChain;
}

async function restore() {
  const doc = await AuctionState.findOne({ key: 'main' }).lean();
  if (!doc) return;
  Object.assign(state, {
    status: doc.status,
    ended: doc.ended,
    player: doc.player,
    currentBid: doc.currentBid,
    leader: doc.leader,
    endsAt: doc.endsAt ? new Date(doc.endsAt).getTime() : null,
    log: doc.log || [],
    version: doc.version || 0,
    lastResult: doc.lastResult || null,
  });

  if (state.status === 'live' && state.player) {
    // Server band tha: bidders ko kam se kam 10 second dobara do
    if (!state.endsAt || state.endsAt - Date.now() < 10000) state.endsAt = Date.now() + 10000;
    timer = setTimeout(finishPlayer, state.endsAt - Date.now());
    await persist();
    console.log(`Restored live auction: ${state.player.name}`);
  } else {
    console.log('Auction state restored');
  }
}

// ---------- Helpers ----------
// Bid ke steps price badhne par bade hote hain (values lakh mein)
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

function emitRefresh() {
  if (io) io.emit('refresh');
}

function startTimer(seconds = BID_SECONDS) {
  clearTimeout(timer);
  state.endsAt = Date.now() + seconds * 1000;
  timer = setTimeout(finishPlayer, seconds * 1000);
}

// Live player hata do aur timer rok do (end + restart mein use hota hai)
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

async function finishPlayer() {
  timer = null;
  const p = state.player;
  const leader = state.leader;
  const price = state.currentBid;
  if (!p || state.status !== 'live') return;

  // Pehle memory reset, taaki late bids turant reject ho jayein
  state.status = 'idle';
  state.player = null;
  state.leader = null;
  state.endsAt = null;
  state.currentBid = 0;
  state.version++;

  state.lastResult = leader
    ? { type: 'sold', player: p.name, team: leader.name, price }
    : { type: 'unsold', player: p.name };

  try {
    // Dobara process na ho (restart ke baad double sale se bachne ke liye)
    const fresh = await Player.findById(p._id).select('status');
    if (fresh && fresh.status === 'available') {
      if (leader) {
        await Player.findByIdAndUpdate(p._id, { status: 'sold', soldTo: leader.teamId, soldPrice: price });
        await Team.findByIdAndUpdate(leader.teamId, { $inc: { purse: -price }, $push: { squad: p._id } });
      } else {
        await Player.findByIdAndUpdate(p._id, { status: 'unsold' });
      }
    }
  } catch (err) {
    console.error('finishPlayer failed:', err.message);
  }

  await persist(); // DB writes ke BAAD save, taaki crash par sale na khoye
  broadcast();
  emitRefresh();
}

// ---------- Socket server ----------
function init(httpServer) {
  io = new Server(httpServer, { cors: { origin: process.env.CLIENT_URL } });

  // Sirf logged-in aur valid users connect kar sakte hain
  io.use(async (socket, next) => {
    try {
      socket.user = await authenticate(socket.handshake.auth?.token);
      next();
    } catch (err) {
      next(new Error(err.message === 'Session expired' ? 'Session expired' : 'Not logged in'));
    }
  });

  io.on('connection', (socket) => {
    const fail = (msg) => socket.emit('error_msg', msg);
    const isAdmin = () => socket.user.role === 'admin';
    socket.emit('state', publicState()); // connect/reconnect par poori state

    // ---- Team bid lagati hai (amount server tay karta hai) ----
    socket.on('place_bid', async () => {
      if (socket.user.role !== 'team' || !socket.user.team) return fail('Only teams can bid');
      if (state.ended) return fail('The auction has ended');
      if (state.status !== 'live') return fail('No player is live');
      if (state.leader?.teamId === socket.user.team) return fail('You already have the highest bid');

      const now = Date.now();
      if (now - (socket.lastBid || 0) < 400) return fail('Slow down');
      socket.lastBid = now;

      const amount = nextBidAmount();
      const version = state.version;
      const team = await Team.findById(socket.user.team).populate('squad', 'nationality');
      if (!team) return fail('Team not found');

      // DB padhte waqt kisi aur ki bid aa gayi ho ya time khatam ho gaya ho
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
      startTimer(); // har bid par clock reset
      persist();
      broadcast();
    });

    // ---- Admin controls ----
    socket.on('admin:next', async () => {
      if (!isAdmin()) return;
      if (state.ended) return fail('The auction has ended. Restart it to begin again.');
      if (state.status === 'live') return fail('A player is already live');
      const count = await Player.countDocuments({ status: 'available' });
      if (!count) return fail('No players left. Use "Re-auction unsold".');
      const p = await Player.findOne({ status: 'available' })
        .skip(Math.floor(Math.random() * count))
        .lean();
      if (state.status === 'live') return; // double click se bachav

      state.status = 'live';
      state.player = { ...p, _id: String(p._id), soldTo: null };
      state.currentBid = p.basePrice;
      state.leader = null;
      state.log = [];
      state.lastResult = null;
      state.version++;
      startTimer(FIRST_BID_SECONDS);
      persist();
      broadcast();
    });

    socket.on('admin:reauction', async () => {
      if (!isAdmin()) return;
      await Player.updateMany({ status: 'unsold' }, { status: 'available' });
      emitRefresh();
    });

    socket.on('admin:end', () => {
      if (!isAdmin() || state.ended) return;
      resetLive(); // live player wapas le liya jata hai, unsold nahi hota
      state.ended = true;
      state.lastResult = { type: 'ended' };
      persist();
      broadcast();
      emitRefresh();
    });

    socket.on('admin:restart', async () => {
      if (!isAdmin()) return;
      resetLive();
      state.ended = false;
      state.lastResult = null;
      await Promise.all([
        Player.updateMany({}, { status: 'available', soldTo: null, soldPrice: 0 }),
        Team.updateMany({}, { purse: STARTING_PURSE, squad: [] }),
        Lineup.deleteMany({}),
        Match.deleteMany({}),
        Match.deleteMany({}),
        Tournament.deleteMany({}),
      ]);
      persist();
      broadcast();
      emitRefresh();
    });
  });
}

module.exports = { init, restore, emitRefresh };