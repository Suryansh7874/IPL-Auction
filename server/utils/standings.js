const Match = require('../models/Match');
const Team = require('../models/Team');

// "16.3" (16 overs 3 balls) -> 16.5 overs
const toOvers = (s) => {
  const [o, b = 0] = String(s).split('.').map(Number);
  return o + b / 6;
};

// Cricket rule: all out ho gaye to poore 20 overs gine jate hain
const oversFaced = (score) => (score.wkts === 10 ? 20 : toOvers(score.overs));

// League matches se points table banata hai
async function computeStandings(tournament) {
  const teams = await Team.find({ _id: { $in: tournament.teams } }).select('name shortName');
  const rows = new Map(
    teams.map((t) => [
      String(t._id),
      { team: t, played: 0, won: 0, lost: 0, points: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0 },
    ])
  );

  const matches = await Match.find({ tournament: tournament._id, stage: 'league' });
  for (const m of matches) {
    const a = rows.get(String(m.teamA));
    const b = rows.get(String(m.teamB));
    if (!a || !b) continue;

    a.played++;
    b.played++;
    const winner = String(m.winner) === String(m.teamA) ? a : b;
    const loser = winner === a ? b : a;
    winner.won++;
    winner.points += 2;
    loser.lost++;

    a.runsFor += m.scoreA.runs;
    a.oversFor += oversFaced(m.scoreA);
    a.runsAgainst += m.scoreB.runs;
    a.oversAgainst += oversFaced(m.scoreB);

    b.runsFor += m.scoreB.runs;
    b.oversFor += oversFaced(m.scoreB);
    b.runsAgainst += m.scoreA.runs;
    b.oversAgainst += oversFaced(m.scoreA);
  }

  const list = [...rows.values()].map((r) => ({
    team: r.team,
    played: r.played,
    won: r.won,
    lost: r.lost,
    points: r.points,
    // Net run rate = (runs scored / overs faced) - (runs conceded / overs bowled)
    nrr: r.played ? r.runsFor / r.oversFor - r.runsAgainst / r.oversAgainst : 0,
  }));

  // Pehle points, barabar hon to net run rate
  list.sort((x, y) => y.points - x.points || y.nrr - x.nrr);
  return list;
}

module.exports = { computeStandings };