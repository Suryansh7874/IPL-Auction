const express = require('express');
const Team = require('../models/Team');
const Lineup = require('../models/Lineup');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const MAX_OVERSEAS_IN_XI = 4;

// GET /api/lineups/me -> your saved lineup (or null)
router.get('/me', requireAuth, async (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ message: 'Teams only' });
  res.json(await Lineup.findOne({ team: req.user.team }));
});

// PUT /api/lineups/me -> validate and save
router.put('/me', requireAuth, async (req, res) => {
  if (req.user.role !== 'team') return res.status(403).json({ message: 'Teams only' });
  const bad = (message) => res.status(400).json({ message });

  const { players = [], bowlers = [], captain, viceCaptain, wicketkeeper } = req.body;
  const team = await Team.findById(req.user.team).populate('squad');
  const squad = new Map(team.squad.map((p) => [String(p._id), p]));

  if (players.length !== 11 || new Set(players).size !== 11) return bad('Pick exactly 11 different players');
  if (!players.every((id) => squad.has(id))) return bad('All players must be from your squad');
  if (bowlers.length < 4 || bowlers.length > 6 || new Set(bowlers).size !== bowlers.length)
    return bad('Pick 4 - 6 bowlers');
  if (!bowlers.every((id) => players.includes(id))) return bad('Bowlers must be in your XI');
  if (!players.includes(captain) || !players.includes(viceCaptain))
    return bad('Pick captain and vice-captain from your XI');
  if (captain === viceCaptain) return bad('Captain and vice-captain must be different');
  if (!players.includes(wicketkeeper) || squad.get(wicketkeeper).role !== 'WK')
    return bad('Wicketkeeper must be a WK player in your XI');
  const overseas = players.filter((id) => squad.get(id).nationality !== 'India').length;
  if (overseas > MAX_OVERSEAS_IN_XI) return bad(`Max ${MAX_OVERSEAS_IN_XI} overseas players in the XI`);

  const lineup = await Lineup.findOneAndUpdate(
    { team: req.user.team },
    { players, bowlers, captain, viceCaptain, wicketkeeper },
    { upsert: true, new: true }
  );
  res.json(lineup);
});

module.exports = router;