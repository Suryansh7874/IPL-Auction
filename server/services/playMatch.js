const Team = require('../models/Team');
const Lineup = require('../models/Lineup');
const Match = require('../models/Match');
const { simulateMatch } = require('../utils/matchSim');

// Aisi galti jo user ko dikhani hai (server error nahi)
class UserError extends Error {}

// Do teams ke saved lineups se match simulate karke database mein save karta hai
async function playMatch(teamAId, teamBId, extra = {}) {
  const [tA, tB] = await Promise.all([Team.findById(teamAId), Team.findById(teamBId)]);
  if (!tA || !tB) throw new UserError('Team not found');

  const [lA, lB] = await Promise.all([
    Lineup.findOne({ team: teamAId }).populate('players bowlers'),
    Lineup.findOne({ team: teamBId }).populate('players bowlers'),
  ]);
  if (!lA) throw new UserError(`${tA.name} has not saved a lineup yet`);
  if (!lB) throw new UserError(`${tB.name} has not saved a lineup yet`);

  const sim = simulateMatch(lA, lB, tA.name, tB.name);
  return Match.create({
    teamA: teamAId,
    teamB: teamBId,
    batFirst: sim.batFirst,
    scoreA: sim.scoreA,
    scoreB: sim.scoreB,
    winner: sim.winner === 'A' ? teamAId : teamBId,
    summary: sim.summary,
    potm: sim.potm,
    ratings: sim.ratings,
    ...extra, // jaise { tournament, stage }
  });
}

module.exports = { playMatch, UserError };