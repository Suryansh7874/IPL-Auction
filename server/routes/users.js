const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { validatePassword } = require('../utils/password');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users -> sab users (password hash kabhi nahi bhejte)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const users = await User.find().select('-passwordHash').populate('team', 'name shortName');
  res.json(users);
});

// POST /api/users/:id/reset-password  { newPassword }
router.post('/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Bad user id' });
  const problem = validatePassword(req.body.newPassword);
  if (problem) return res.status(400).json({ message: problem });

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.passwordHash = await bcrypt.hash(String(req.body.newPassword), 10);
  user.tokenVersion += 1; // us user ko turant logout
  await user.save();
  res.json({ message: `Password reset for ${user.username}` });
});

module.exports = router;