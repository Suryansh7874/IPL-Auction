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
const running = new Set(); // jin tournaments ke matches abhi chal rahe hain

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Ek match khelne ke baad: league khatam ho gayi to playoffs banao, ya agla playoff match bharo
async function advance(t, fixture, match) {
  const loser = String(match.winner) === String(fixture.teamA) ? fixture.teamB : fixture.teamA;
  const get = (stage) => t.fixtures.find((f) => f.stage === stage);

  if (fixture.stage === 'league') {
    const leagueDone = t.fixtures.filter((f) => f.stage === 'league').every((f) => f.match);
    if (!leagueDone) return;

    const top = (await computeStandings(t)).map((s) => s.team._id);
    if (top.length >= 4) {
      t.fixtures.push(
        { stage: 'qualifier1', label: 'Qualifier 1 (1st v 2nd)', teamA: top[0], teamB: top[1] },
        { stage: 'eliminator', label: 'Eliminator (3rd v 4th)', teamA: top[2], teamB: top[3] },
        { stage: 'qualifier2', label: 'Qualifier 2' },
        { stage: 'final', label: 'Final' }
      );
    } else {
      t.fixtures.push({ stage: 'final', label: 'Final (1st v 2nd)', teamA: top[0], teamB: top[1] });
    }
    t.status = 'playoffs';
  } else if (fixture.stage === 'qualifier1') {
    get('qualifier2').teamA = loser; // haara hua dusra mauka paata hai
    get('final').teamA = match.winner; // jeeta hua seedha final
  } else if (fixture.stage === 'eliminator') {
    get('qualifier2').teamB = match.winner; // haara hua bahar
  } else if (fixture.stage === 'qualifier2') {
    get('final').teamB = match.winner;
  } else if (fixture.stage === 'final') {
    t.status = 'completed';
    t.champion = match.winner;
  }
}

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

// GET /api/tournaments/current -> sabse naya tournament + points table
router.get('/current', requireAuth, async (req, res) => {
  const t = await Tournament.findOne().sort({ createdAt: -1 });
  if (!t) return res.json(null);

  const standings = await computeStandings(t);
  await t.populate([
    { path: 'teams', select: 'name shortName' },
    { path: 'champion', select: 'name shortName' },
    { path: 'fixtures.teamA', select: 'name shortName' },
    { path: 'fixtures.teamB', select: 'name shortName' },
    { path: 'fixtures.winner', select: 'name shortName' },
    { path: 'fixtures.match', select: 'scoreA scoreB summary potm' },
  ]);
  res.json({ tournament: t, standings });
});

// POST /api/tournaments { name, rounds } -> admin naya tournament banata hai
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const name = String(req.body.name || '').trim() || 'IPL Season';
  const rounds = req.body.rounds === 2 ? 2 : 1;

  if (await Tournament.findOne({ status: { $ne: 'completed' } })) {
    return res.status(400).json({ message: 'Finish or reset the current tournament first' });
  }

  const teams = await Team.find().sort({ shortName: 1 });
  if (teams.length < 2) return res.status(400).json({ message: 'Need at least 2 teams' });

  // Har team ka lineup saved hona chahiye
  const lineups = await Lineup.find({ team: { $in: teams.map((t) => t._id) } }).select('team');
  const have = new Set(lineups.map((l) => String(l.team)));
  const missing = teams.filter((t) => !have.has(String(t._id))).map((t) => t.shortName);
  if (missing.length) {
    return res.status(400).json({ message: `These teams have not saved a lineup: ${missing.join(', ')}` });
  }

  // Round-robin: har jodi rounds baar khelti hai
  const fixtures = [];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const [a, b] = r % 2 === 0 ? [teams[i], teams[j]] : [teams[j], teams[i]];
        fixtures.push({ stage: 'league', label: 'League match', teamA: a._id, teamB: b._id });
      }
    }
  }
  shuffle(fixtures); // taaki ek hi team lagatar na khele

  const t = await Tournament.create({ name, rounds, teams: teams.map((x) => x._id), fixtures });
  emitRefresh();
  res.status(201).json(t);
});

// POST /api/tournaments/:id/play { mode: 'next' | 'league' | 'all' }
router.post('/:id/play', requireAuth, requireAdmin, async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Bad tournament id' });
  const t = await Tournament.findById(id);
  if (!t) return res.status(404).json({ message: 'Tournament not found' });
  if (t.status === 'completed') return res.status(400).json({ message: 'Tournament is already finished' });
  if (running.has(id)) return res.status(409).json({ message: 'Matches are already being played' });

  const mode = ['next', 'league', 'all'].includes(req.body.mode) ? req.body.mode : 'next';
  running.add(id);
  let played = 0;
  try {
    while (t.status !== 'completed') {
      const next = t.fixtures.find((f) => !f.match && f.teamA && f.teamB);
      if (!next) break;
      if (mode === 'league' && next.stage !== 'league') break;
      await playFixture(t, next);
      played++;
      if (mode === 'next') break;
    }
  } catch (e) {
    if (e instanceof UserError) return res.status(400).json({ message: e.message });
    throw e;
  } finally {
    running.delete(id);
  }

  emitRefresh();
  res.json({ played, status: t.status });
});

// DELETE /api/tournaments/:id -> tournament aur uske saare matches hata do
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Bad tournament id' });
  await Match.deleteMany({ tournament: req.params.id });
  await Tournament.deleteOne({ _id: req.params.id });
  emitRefresh();
  res.json({ message: 'Tournament deleted' });
});

module.exports = router;