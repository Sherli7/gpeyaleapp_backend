// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const candidatureRoutes = require('./routes/candidatures.routes'); // ✅ PAS de { ... }
const errorHandler = require('./middlewares/error-handler');       // ✅ PAS de { ... }

const app = express();

app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// CORS
const parseOrigins = (str) => (!str ? [] : str.split(',').map(s => s.trim()).filter(Boolean));
const whitelist = parseOrigins(process.env.CORS_ORIGINS);
const corsOptions = {
  origin: (origin, cb) => (!origin || whitelist.includes(origin)) ? cb(null, true) : cb(new Error('Origine non autorisée par CORS')),
  credentials: true
};
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !whitelist.includes(origin)) return res.status(403).json({ success: false, message: 'CORS: origine non autorisée' });
  next();
});
app.use(cors(corsOptions));

// Rate limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Routes
app.use('/api/candidatures', candidatureRoutes); // ✅ Attend un Router (fonction)

// Health
app.get('/health', (_req, res) => res.json({ ok: true }));

// Error handler (doit être une fonction middleware)
app.use(errorHandler);

module.exports = app;
// Application Express principale
// --- IGNORE ---