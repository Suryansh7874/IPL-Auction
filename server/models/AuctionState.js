const mongoose = require('mongoose');
const { Mixed } = mongoose.Schema.Types;

// Sirf ek document: key = 'main'
const auctionStateSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'main' },
    status: { type: String, default: 'idle' },
    ended: { type: Boolean, default: false },
    player: Mixed,
    currentBid: { type: Number, default: 0 },
    leader: Mixed,
    endsAt: Date,
    log: [Mixed],
    version: { type: Number, default: 0 },
    lastResult: Mixed,
  },
  { minimize: false }
);

module.exports = mongoose.model('AuctionState', auctionStateSchema);