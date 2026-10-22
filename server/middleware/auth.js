const User = require('../models/User');
const { readToken } = require('../utils/token');

// Token sahi hai AUR user abhi bhi exist karta hai AUR tokenVersion match karta hai
async function authenticate(token) {
  if (!token) throw new Error('Not logged in');
  const payload = readToken(token); // bad ya expired token par error
  const user = await User.findById(payload.id);
  if (!user || (user.tokenVersion || 0) !== payload.v) throw new Error('Session expired');
  return {
    id: String(user._id),
    username: user.username,
    role: user.role,
    team: user.team ? String(user.team) : null,
  };
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    req.user = await authenticate(header.startsWith('Bearer ') ? header.slice(7) : null);
    next();
  } catch {
    res.status(401).json({ message: 'Please log in again' });
  }
}

// Usage: router.post('/x', requireAuth, requireRole('admin'), handler)
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ message: 'You do not have permission to do this' });

const requireAdmin = requireRole('admin');

// Team user jiska team linked ho
const requireTeam = [
  requireRole('team'),
  (req, res, next) =>
    req.user.team ? next() : res.status(403).json({ message: 'Your account is not linked to a team' }),
];

module.exports = { authenticate, requireAuth, requireRole, requireAdmin, requireTeam };