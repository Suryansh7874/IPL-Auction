// Overall score (0-100) from individual skill scores (each 0-100).
// Different roles weight skills differently.
const WEIGHTS = {
  BAT:  { batting: 0.60, bowling: 0.05, fielding: 0.15, experience: 0.20 },
  BOWL: { batting: 0.05, bowling: 0.60, fielding: 0.15, experience: 0.20 },
  AR:   { batting: 0.35, bowling: 0.35, fielding: 0.10, experience: 0.20 },
  WK:   { batting: 0.50, bowling: 0.00, fielding: 0.30, experience: 0.20 },
};

function computeOverall(player) {
  const w = WEIGHTS[player.role] || WEIGHTS.AR;
  const total =
    player.batting * w.batting +
    player.bowling * w.bowling +
    player.fielding * w.fielding +
    player.experience * w.experience;
  return Math.round(total);
}

module.exports = { computeOverall };
