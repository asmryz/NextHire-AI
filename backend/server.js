require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');

const app = express();

const siteUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const isLocal = (origin) => /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
app.use(cors({ origin: (origin, cb) => cb(null, !origin || origin === siteUrl || isLocal(origin)) }));

app.use(express.json({ limit: '1mb' }));

//Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth.routes'));              
app.use('/api/vacancies', require('./routes/vacancy.routes'));      
app.use('/api/departments', require('./routes/department.routes')); 
app.use('/api/candidate', require('./routes/candidate.routes'));     
app.use('/api/interviewers', require('./routes/interviewer.routes'));  
app.use('/api/inbox', require('./routes/inbox.routes'));              

//Unknown route
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));


app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'System temporarily unavailable. Please try again later.' });
});

const PORT = process.env.PORT || 5000;
testConnection().then(() => {
  app.listen(PORT, () => console.log(`NexHire AI Backend running on port ${PORT}`));
});