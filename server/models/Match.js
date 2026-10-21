const mongoose = require('mongoose');
const { ObjectId, Mixed } = mongoose.Schema.Types;

const score = { runs: Number, wkts: Number, overs: String };

const matchSchema = new mongoose.Schema(
  {
    teamA: { type: ObjectId, ref: 'Team' },
    teamB: { type: ObjectId, ref: 'Team' },
    batFirst: String, // 'A' or 'B'
    scoreA: score,
    scoreB: score,
    winner: { type: ObjectId, ref: 'Team' },
    summary: String,
    potm: String,
    ratings: Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Match', matchSchema);