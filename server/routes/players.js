const express = require('express');
const Player = require('../models/Player');
const { computeOverall } = require('../utils/score');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/players?role=BAT&status=sold  -> list players (any logged-in user)
router.get('/', requireAuth, async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;
  const players = await Player.find(filter)
    .populate('soldTo', 'name shortName')
    .sort({ overall: -1 });
  res.json(players);
});

// POST /api/players -> add a player (admin only); overall score is computed
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const data = req.body;
  data.overall = computeOverall(data);
  const player = await Player.create(data);
  res.status(201).json(player);
});

module.exports = router;
