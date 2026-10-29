// backend/server.js
// Owner: Aarian (shared file: new routes are added here with ONE line, tell your partner first)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');

const app = express();

// Allowed frontend addresses (trailing "/" removed; both Vite ports allowed in development)
const allowedOrigins = [
  (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, ''),
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

// ---- Routes (one line each) ------------------------------------------
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth.routes'));               // Aarian
app.use('/api/vacancies', require('./routes/vacancy.routes'));       // Aarian
app.use('/api/departments', require('./routes/department.routes'));  // Shivani
app.use('/api/candidate', require('./routes/candidate.routes'));     // Shivani
app.use('/api/interviewers', require('./routes/interviewer.routes'));  // Aarian

// ---- Unknown route ---------------------------------------------------
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

// ---- Error handler (anything not caught in a controller) -------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'System temporarily unavailable. Please try again later.' });
});

const PORT = process.env.PORT || 5000;
testConnection().then(() => {
  app.listen(PORT, () => console.log(`NexHire AI Backend running on port ${PORT}`));
});