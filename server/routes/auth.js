const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// POST /api/auth/login  { username, password }
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return res.status(400).json({ message: 'Wrong username or password' });
  }
  const token = jwt.sign(
    { id: user._id, role: user.role, team: user.team },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  res.json({ token, role: user.role, username: user.username, team: user.team });
});

module.exports = router;
