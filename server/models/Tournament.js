const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

// Ek fixture = ek tay hua match (jab tak khela nahi gaya, match = null)
const fixtureSchema = new mongoose.Schema({
  stage: String, // 'league' | 'qualifier1' | 'eliminator' | 'qualifier2' | 'final'
  label: String,
  teamA: { type: ObjectId, ref: 'Team', default: null }, // null = abhi tay nahi (TBD)
  teamB: { type: ObjectId, ref: 'Team', default: null },
  match: { type: ObjectId, ref: 'Match', default: null },
  winner: { type: ObjectId, ref: 'Team', default: null },
});

const tournamentSchema = new mongoose.Schema(
  {
    name: String,
    rounds: { type: Number, default: 1 }, // 1 = single, 2 = double round-robin
    teams: [{ type: ObjectId, ref: 'Team' }],
    status: { type: String, enum: ['league', 'playoffs', 'completed'], default: 'league' },
    champion: { type: ObjectId, ref: 'Team', default: null },
    fixtures: [fixtureSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tournament', tournamentSchema);