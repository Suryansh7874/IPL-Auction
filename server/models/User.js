const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'team'], default: 'team' },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  // Badhane par is user ke saare purane tokens bekaar ho jate hain
  tokenVersion: { type: Number, default: 0 },
});

module.exports = mongoose.model('User', userSchema);