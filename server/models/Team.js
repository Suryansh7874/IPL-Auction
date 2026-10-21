const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  shortName: { type: String, required: true },
  // Money is stored in lakhs of rupees (100 Cr = 10000 lakh)
  purse: { type: Number, default: 10000 },
  squad: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
});

module.exports = mongoose.model('Team', teamSchema);
