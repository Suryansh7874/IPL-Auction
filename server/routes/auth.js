const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { signToken } = require('../utils/token');
const { validatePassword } = require('../utils/password');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// 15 minute mein 10 galat koshish (sahi login count nahi hote)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in 15 minutes.' },
});

// User na mile tab bhi bcrypt chalta hai, taaki response time se username pata na chale
const DUMMY_HASH = bcrypt.hashSync('dummy-password-123', 10);

// POST /api/auth/login  { username, password }
// NOTE: galat password par 400 hi rakha hai (401 client mein "session expire" maana jata hai)
router.post('/login', loginLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  const user = await User.findOne({ username });
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) return res.status(400).json({ message: 'Wrong username or password' });

  res.json({ token: signToken(user), role: user.role, username: user.username, team: user.team });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

// POST /api/auth/change-password  { currentPassword, newPassword }
router.post('/change-password', requireAuth, loginLimiter, async (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body;
  const user = await User.findById(req.user.id);

  if (!(await bcrypt.compare(String(currentPassword), user.passwordHash))) {
    return res.status(400).json({ message: 'Current password is wrong' });
  }
  const problem = validatePassword(newPassword);
  if (problem) return res.status(400).json({ message: problem });

  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  user.tokenVersion += 1; // purane tokens bekaar
  await user.save();
  res.json({ token: signToken(user), message: 'Password changed' });
});

module.exports = router;