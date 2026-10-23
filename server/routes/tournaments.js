
const express = require('express');
const mongoose = require('mongoose');

const Team = require('../models/Team');
const Lineup = require('../models/Lineup');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');

const { playMatch, UserError } = require('../services/playMatch');
const { computeStandings } = require('../utils/standings');
const { emitRefresh } = require('../auction');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const running = new Set();

// Shuffle fixtures
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Advance tournament after a match
async function advance(t, fixture, match) {
  const loser =
    String(match.winner) === String(fixture.teamA)
      ? fixture.teamB
      : fixture.teamA;

  const get = (stage) => t.fixtures.find((f) => f.stage === stage);

  if (fixture.stage === 'league') {
    const leagueFixtures = t.fixtures.filter(
      (f) => f.stage === 'league'
    );

    const leagueDone = leagueFixtures.every((f) => f.match);

    if (!leagueDone) return;

    const top = (await computeStandings(t)).map((s) => s.team._id);

    if (top.length >= 4) {
      t.fixtures.push(
        {
          stage: 'qualifier1',
          label: 'Qualifier 1 (1st v 2nd)',
          teamA: top[0],
          teamB: top[1],
        },
        {
          stage: 'eliminator',
          label: 'Eliminator (3rd v 4th)',
          teamA: top[2],
          teamB: top[3],
        },
        {
          stage: 'qualifier2',
          label: 'Qualifier 2',
        },
        {
          stage: 'final',
          label: 'Final',
        }
      );
    } else if (top.length >= 2) {
      t.fixtures.push({
        stage: 'final',
        label: 'Final (1st v 2nd)',
        teamA: top[0],
        teamB: top[1],
      });
    } else {
      throw new UserError('Not enough teams to create the final');
    }

    t.status = 'playoffs';
  } else if (fixture.stage === 'qualifier1') {
    const qualifier2 = get('qualifier2');
    const final = get('final');

    if (!qualifier2 || !final) {
      throw new Error('Playoff fixtures are missing');
    }

    qualifier2.teamA = loser;
    final.teamA = match.winner;
  } else if (fixture.stage === 'eliminator') {
    const qualifier2 = get('qualifier2');

    if (!qualifier2) {
      throw new Error('Qualifier 2 fixture is missing');
    }

    qualifier2.teamB = match.winner;
  } else if (fixture.stage === 'qualifier2') {
    const final = get('final');

    if (!final) {
      throw new Error('Final fixture is missing');
    }

    final.teamB = match.winner;
  } else if (fixture.stage === 'final') {
    t.status = 'completed';
    t.champion = match.winner;
  }
}

// Play one fixture
async function playFixture(t, fixture) {
  const match = await playMatch(fixture.teamA, fixture.teamB, {
    tournament: t._id,
    stage: fixture.stage,
  });

  fixture.match = match._id;
  fixture.winner = match.winner;

  await advance(t, fixture, match);
  await t.save();
}

// GET /api/tournaments/teams
router.get('/teams', requireAuth, async (req, res) => {
  try {
    const teams = await Team.find()
      .select('name shortName')
      .sort({ shortName: 1 });

    res.json(teams);
  } catch (err) {
    console.error('Fetching tournament teams failed:', err);
    res.status(500).json({ message: 'Failed to fetch teams' });
  }
});

// GET /api/tournaments/current
router.get('/current', requireAuth, async (req, res) => {
  try {
    const t = await Tournament.findOne().sort({ createdAt: -1 });

    if (!t) return res.json(null);

    const standings = await computeStandings(t);

    await t.populate([
      { path: 'teams', select: 'name shortName' },
      { path: 'champion', select: 'name shortName' },
      { path: 'fixtures.teamA', select: 'name shortName' },
      { path: 'fixtures.teamB', select: 'name shortName' },
      { path: 'fixtures.winner', select: 'name shortName' },
      {
        path: 'fixtures.match',
        select: 'scoreA scoreB summary potm',
      },
    ]);

    res.json({ tournament: t, standings });
  } catch (err) {
    console.error('Fetching current tournament failed:', err);
    res.status(500).json({ message: 'Failed to fetch tournament' });
  }
});

// POST /api/tournaments
// Body: { name, rounds, teamIds }
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const name =
      String(req.body.name || '').trim() || 'IPL Season';

    const rounds = Number(req.body.rounds) === 2 ? 2 : 1;
    const { teamIds } = req.body;

    // An unfinished tournament must be completed or deleted first
    const existing = await Tournament.findOne({
      status: { $ne: 'completed' },
    });

    if (existing) {
      return res.status(400).json({
        message: 'Finish or reset the current tournament first',
      });
    }

    // Validate selected teams
    if (!Array.isArray(teamIds) || teamIds.length < 2) {
      return res.status(400).json({
        message: 'Select at least 2 teams',
      });
    }

    if (teamIds.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({
        message: 'One or more team IDs are invalid',
      });
    }

    // Declare uniqueIds BEFORE using it
    const uniqueIds = [...new Set(teamIds.map(String))];

    if (uniqueIds.length !== teamIds.length) {
      return res.status(400).json({
        message: 'Duplicate teams are not allowed',
      });
    }

    // Fetch only selected teams
    const teams = await Team.find({
      _id: { $in: uniqueIds },
    }).sort({ shortName: 1 });

    if (teams.length !== uniqueIds.length) {
      return res.status(400).json({
        message: 'One or more selected teams do not exist',
      });
    }

    // Validate lineups ONLY for selected teams
    const lineups = await Lineup.find({
      team: { $in: teams.map((team) => team._id) },
    }).select('team');

    const teamsWithLineups = new Set(
      lineups.map((lineup) => String(lineup.team))
    );

    const missing = teams
      .filter(
        (team) => !teamsWithLineups.has(String(team._id))
      )
      .map((team) => team.shortName);

    if (missing.length > 0) {
      return res.status(400).json({
        message: `Save a lineup for these selected teams first: ${missing.join(', ')}`,
      });
    }

    // Generate round-robin fixtures
    const fixtures = [];

    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const [a, b] =
            r % 2 === 0
              ? [teams[i], teams[j]]
              : [teams[j], teams[i]];

          fixtures.push({
            stage: 'league',
            label: 'League match',
            teamA: a._id,
            teamB: b._id,
          });
        }
      }
    }

    shuffle(fixtures);

    const tournament = await Tournament.create({
      name,
      rounds,
      teams: teams.map((team) => team._id),
      fixtures,
    });

    emitRefresh();

    return res.status(201).json(tournament);
  } catch (err) {
    console.error('Tournament creation failed:', err);

    return res.status(500).json({
      message: err.message || 'Failed to create tournament',
    });
  }
});

// POST /api/tournaments/:id/play
// Body: { mode: 'next' | 'league' | 'all' }
router.post('/:id/play', requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Bad tournament id' });
  }

  let t;

  try {
    t = await Tournament.findById(id);

    if (!t) {
      return res.status(404).json({
        message: 'Tournament not found',
      });
    }

    if (t.status === 'completed') {
      return res.status(400).json({
        message: 'Tournament is already finished',
      });
    }

    if (running.has(id)) {
      return res.status(409).json({
        message: 'Matches are already being played',
      });
    }

    const mode = ['next', 'league', 'all'].includes(req.body.mode)
      ? req.body.mode
      : 'next';

    running.add(id);

    let played = 0;

    try {
      while (t.status !== 'completed') {
        const next = t.fixtures.find(
          (f) => !f.match && f.teamA && f.teamB
        );

        if (!next) break;

        if (mode === 'league' && next.stage !== 'league') break;

        await playFixture(t, next);
        played++;

        if (mode === 'next') break;
      }
    } finally {
      running.delete(id);
    }

    emitRefresh();

    return res.json({ played, status: t.status });
  } catch (err) {
    console.error('Playing tournament match failed:', err);

    if (err instanceof UserError) {
      return res.status(400).json({ message: err.message });
    }

    return res.status(500).json({
      message: err.message || 'Failed to play tournament match',
    });
  } finally {
    // Safe even if the match loop already removed it
    running.delete(id);
  }
});

// DELETE /api/tournaments/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Bad tournament id',
      });
    }

    await Match.deleteMany({ tournament: req.params.id });
    await Tournament.deleteOne({ _id: req.params.id });

    emitRefresh();

    return res.json({ message: 'Tournament deleted' });
  } catch (err) {
    console.error('Deleting tournament failed:', err);

    return res.status(500).json({
      message: err.message || 'Failed to delete tournament',
    });
  }
});

module.exports = router;
