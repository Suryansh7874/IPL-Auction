const path = require('path');
// Load .env from the server folder, no matter where you start node from
require('dotenv').config({ path: path.join(__dirname, '.env') });
// Safe local defaults so the app still starts if .env is missing

process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ipl-auction';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
process.env.CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
 
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
const http = require('http');
const server = http.createServer(app);
require('./auction').init(server);

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/lineups', require('./routes/lineups'));
app.use('/api/matches', require('./routes/matches'));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    // app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
