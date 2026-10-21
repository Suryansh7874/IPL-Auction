const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'team'], default: 'team' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
});

module.exports = mongoose.model('User', userSchema);
