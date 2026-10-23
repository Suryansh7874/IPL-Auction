// Run:  npm run seed   (DELETES EVERYTHING and starts fresh)
// Creates 1 admin, 4 teams (same purse), 4 team logins and 100 players.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Team = require('./models/Team');
const Player = require('./models/Player');
const Lineup = require('./models/Lineup');
const Match = require('./models/Match');
const AuctionState = require('./models/AuctionState');
const { TEAMS, PLAYERS } = require('./data/players');
const { STARTING_PURSE } = require('./config');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ipl-auction';

async function run() {
  await mongoose.connect(MONGO_URI);
  await Promise.all([
    User.deleteMany({}),
    Team.deleteMany({}),
    Player.deleteMany({}),
    Lineup.deleteMany({}),
    Match.deleteMany({}),
    AuctionState.deleteMany({}),
  ]);

  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  await User.create({ username: 'admin', passwordHash: adminHash, role: 'admin' });

  for (const t of TEAMS) {
   const team = await Team.create({ ...t, purse: STARTING_PURSE });
    const hash = await bcrypt.hash(process.env.TEAM_PASSWORD || 'team123', 10);
    await User.create({
      username: t.shortName.toLowerCase(),
      passwordHash: hash,
      role: 'team',
      team: team._id,
    });
  }

  await Player.insertMany(PLAYERS);

  console.log(`Seed done: ${TEAMS.length} teams, ${PLAYERS.length} players.`);
  console.log('Admin login:  admin');
  console.log(`Team logins:  ${TEAMS.map((t) => t.shortName.toLowerCase()).join(', ')}`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});