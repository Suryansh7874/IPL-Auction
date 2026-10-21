// Weight of each batting position (opener counts most)
const ORDER_WEIGHTS = [1, 1, 1, 0.95, 0.9, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1];

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const round1 = (x) => Math.round(x * 10) / 10;

function ratings(lineup) {
  const xi = lineup.players; // populated, in batting order
  const id = (p) => String(p._id);
  const wSum = ORDER_WEIGHTS.reduce((a, b) => a + b, 0);

  const bat = xi.reduce((s, p, i) => s + p.batting * ORDER_WEIGHTS[i], 0) / wSum;
  const bowl = lineup.bowlers.reduce((s, p) => s + p.bowling, 0) / lineup.bowlers.length;
  const field = xi.reduce((s, p) => s + p.fielding, 0) / xi.length;

  const cap = xi.find((p) => id(p) === String(lineup.captain));
  const vc = xi.find((p) => id(p) === String(lineup.viceCaptain));
  const wk = xi.find((p) => id(p) === String(lineup.wicketkeeper));
  const boost = 1 + (cap.experience / 100) * 0.05 + (vc.experience / 100) * 0.02 + (wk.fielding / 100) * 0.02;

  return { bat, bowl, field, boost };
}

function innings(batR, bowlR) {
  const edge =
    (batR.bat * 0.7 + batR.field * 0.3) * batR.boost -
    (bowlR.bowl * 0.8 + bowlR.field * 0.2) * bowlR.boost;
  const runs = Math.round(clamp(165 + edge * 1.5 + rand(-30, 30), 80, 260));
  const wkts = Math.round(clamp(6 - edge / 4 + rand(-2.5, 2.5), 1, 10));
  return { runs, wkts };
}

const oversStr = (allOut) =>
  allOut ? `${Math.floor(rand(15, 20))}.${Math.floor(rand(0, 6))}` : '20.0';

function simulateMatch(lineupA, lineupB, nameA, nameB) {
  const R = { A: ratings(lineupA), B: ratings(lineupB) };
  const L = { A: lineupA, B: lineupB };
  const names = { A: nameA, B: nameB };

  const first = Math.random() < 0.5 ? 'A' : 'B';
  const second = first === 'A' ? 'B' : 'A';

  const i1 = innings(R[first], R[second]);
  const s1 = { runs: i1.runs, wkts: i1.wkts, overs: oversStr(i1.wkts === 10) };

  const i2 = innings(R[second], R[first]);
  const target = s1.runs + 1;
  let s2, winner, margin;

  if (i2.runs >= target) {
    const wkts = Math.min(i2.wkts, 9);
    s2 = { runs: target, wkts, overs: `${Math.floor(rand(15, 20))}.${Math.floor(rand(0, 6))}` };
    winner = second;
    margin = `${10 - wkts} wickets`;
  } else {
    s2 = { runs: i2.runs, wkts: i2.wkts, overs: oversStr(i2.wkts === 10) };
    if (i2.runs === s1.runs) {
      const total = (r) => r.bat + r.bowl;
      winner = Math.random() < total(R[first]) / (total(R[first]) + total(R[second])) ? first : second;
      margin = 'the super over (scores tied)';
    } else {
      winner = first;
      margin = `${s1.runs - i2.runs} runs`;
    }
  }

  // Player of the match: from the winning XI, higher overall = better chance
  const potm = L[winner].players.reduce((best, p) =>
    p.overall * rand(0.6, 1.4) > best.score ? { score: p.overall * rand(0.6, 1.4), name: p.name } : best,
    { score: 0, name: '' }
  ).name;

  const fmtR = (r) => ({ bat: round1(r.bat), bowl: round1(r.bowl), field: round1(r.field), boost: round1(r.boost * 100 - 100) });

  return {
    batFirst: first,
    scoreA: first === 'A' ? s1 : s2,
    scoreB: first === 'A' ? s2 : s1,
    winner,
    summary: `${names[winner]} won by ${margin}`,
    potm,
    ratings: { A: fmtR(R.A), B: fmtR(R.B) },
  };
}

module.exports = { simulateMatch };