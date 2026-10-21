const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Player = require('./models/Player');
const Team = require('./models/Team');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ipl-auction');
  const teams = await Team.find().sort({ shortName: 1 });
  const players = await Player.find().sort({ overall: -1 });
  teams.forEach((t) => { t.squad = []; t.purse = 10000; });

  // Snake draft by overall score so teams are balanced
  players.forEach((p, i) => {
    const round = Math.floor(i / teams.length);
    const idx = i % teams.length;
    const t = round % 2 === 0 ? teams[idx] : teams[teams.length - 1 - idx];
    p.status = 'sold';
    p.soldTo = t._id;
    p.soldPrice = p.basePrice;
    t.squad.push(p._id);
    t.purse -= p.basePrice;
  });

  await Promise.all([...teams.map((t) => t.save()), ...players.map((p) => p.save())]);
  console.log('Squads filled. (Run "npm run seed" to reset for a real auction.)');
  process.exit(0);
})();