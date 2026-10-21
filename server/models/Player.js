const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['BAT', 'BOWL', 'AR', 'WK'], required: true },
  nationality: { type: String, default: 'India' },
  basePrice: { type: Number, required: true }, // in lakhs
  batting: { type: Number, min: 0, max: 100, required: true },
  bowling: { type: Number, min: 0, max: 100, required: true },
  fielding: { type: Number, min: 0, max: 100, required: true },
  experience: { type: Number, min: 0, max: 100, required: true },
  overall: { type: Number, default: 0 },
  status: { type: String, enum: ['available', 'sold', 'unsold'], default: 'available' },
  soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  soldPrice: { type: Number, default: 0 },
});

module.exports = mongoose.model('Player', playerSchema);
