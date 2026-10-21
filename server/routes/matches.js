const express = require('express');
const Team = require('../models/Team');
const Lineup = require('../models/Lineup');
const Match = require('../models/Match');
const { simulateMatch } = require('../utils/matchSim');
const { emitRefresh } = require('../auction');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/matches -> latest results
router.get('/', requireAuth, async (req, res) => {
  const matches = await Match.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('teamA teamB', 'name shortName');
  res.json(matches);
});

// POST /api/matches { teamA, teamB } -> admin simulates a match
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { teamA, teamB } = req.body;
  if (!teamA || !teamB || teamA === teamB) return res.status(400).json({ message: 'Pick two different teams' });

  const [tA, tB] = await Promise.all([Team.findById(teamA), Team.findById(teamB)]);
  if (!tA || !tB) return res.status(404).json({ message: 'Team not found' });

  const [lA, lB] = await Promise.all([
    Lineup.findOne({ team: teamA }).populate('players bowlers'),
    Lineup.findOne({ team: teamB }).populate('players bowlers'),
  ]);
  if (!lA) return res.status(400).json({ message: `${tA.name} has not saved a lineup yet` });
  if (!lB) return res.status(400).json({ message: `${tB.name} has not saved a lineup yet` });

  const sim = simulateMatch(lA, lB, tA.name, tB.name);
  const match = await Match.create({
    teamA, teamB,
    batFirst: sim.batFirst,
    scoreA: sim.scoreA,
    scoreB: sim.scoreB,
    winner: sim.winner === 'A' ? teamA : teamB,
    summary: sim.summary,
    potm: sim.potm,
    ratings: sim.ratings,
  });
  emitRefresh();
  res.status(201).json(match);
});

module.exports = router;