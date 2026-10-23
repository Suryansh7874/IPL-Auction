const mongoose = require('mongoose');
const { STARTING_PURSE } = require('../config');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  shortName: { type: String, required: true },
  purse: { type: Number, default: STARTING_PURSE },
  squad: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
});

module.exports = mongoose.model('Team', teamSchema);