const express = require('express');
const Team = require('../models/Team');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/teams -> every team with its squad (name, role, price paid)
router.get('/', requireAuth, async (req, res) => {
    const teams = await Team.find().populate(
        'squad',
        'name role nationality overall soldPrice batting bowling fielding experience'
    );
  res.json(teams);
});

module.exports = router;