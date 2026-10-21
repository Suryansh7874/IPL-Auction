const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const lineupSchema = new mongoose.Schema({
  team: { type: ObjectId, ref: 'Team', unique: true, required: true },
  players: [{ type: ObjectId, ref: 'Player' }], // 11 players, in batting order
  bowlers: [{ type: ObjectId, ref: 'Player' }], // 5 or 6, all from the XI
  captain: { type: ObjectId, ref: 'Player' },
  viceCaptain: { type: ObjectId, ref: 'Player' },
  wicketkeeper: { type: ObjectId, ref: 'Player' },
});

module.exports = mongoose.model('Lineup', lineupSchema);