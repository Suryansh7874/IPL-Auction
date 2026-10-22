const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Production mein JWT_SECRET zaroori hai
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET must be set in production');
  process.exit(1);
}
// Local development ke liye safe defaults
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ipl-auction';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const http = require('http');
const express = require('express');
require('express-async-errors'); // async routes ke errors server crash nahi karenge
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const auction = require('./auction');

const app = express();
app.set('trust proxy', 1); // Render proxy ke peeche sahi IP ke liye
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/players', require('./routes/players'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/lineups', require('./routes/lineups'));
app.use('/api/matches', require('./routes/matches'));

// Aakhri safety net
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

const server = http.createServer(app);
auction.init(server);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await auction.restore(); // saved auction wapas load karo
    server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
  });