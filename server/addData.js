// Run:  npm run adddata
// Adds any MISSING team and any MISSING players from data/players.js. Nothing is deleted.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Team = require('./models/Team');
const Player = require('./models/Player');
const { TEAMS, PLAYERS } = require('./data/players');
const { STARTING_PURSE } = require('./config');

async function run() {
  if (!process.env.TEAM_PASSWORD) {
    console.error('Set TEAM_PASSWORD in server/.env first (password for new team logins).');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ipl-auction');

  let newTeams = 0;
  let newPlayers = 0;

  for (const t of TEAMS) {
    if (await Team.findOne({ shortName: t.shortName })) continue;
    const team = await Team.create({ ...t, purse: STARTING_PURSE });
    await User.create({
      username: t.shortName.toLowerCase(),
      passwordHash: await bcrypt.hash(process.env.TEAM_PASSWORD, 10),
      role: 'team',
      team: team._id,
    });
    newTeams++;
    console.log(`Added team ${t.name} (login: ${t.shortName.toLowerCase()})`);
  }

  for (const p of PLAYERS) {
    if (await Player.findOne({ name: p.name })) continue;
    await Player.create(p);
    newPlayers++;
  }

  console.log(`Done: ${newTeams} new team(s), ${newPlayers} new player(s).`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});