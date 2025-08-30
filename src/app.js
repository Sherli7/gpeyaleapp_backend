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

// Configuration CORS avec gestion des erreurs
const corsOptions = {
  origin: (origin, cb) => {
    // Permettre les requêtes sans origine (comme les appels API directs)
    if (!origin) {
      return cb(null, true);
    }
    
    // Vérifier si l'origine est dans la whitelist
    if (whitelist.includes(origin)) {
      return cb(null, true);
    }
    
    // Log pour debug
    console.log(`[CORS] Origine rejetée: ${origin}`);
    console.log(`[CORS] Whitelist: ${whitelist.join(', ')}`);
    
    return cb(new Error('Origine non autorisée par CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200 // Pour les navigateurs legacy
};

app.use(cors(corsOptions));

// Middleware pour gérer les erreurs CORS
app.use((err, req, res, next) => {
  if (err.message === 'Origine non autorisée par CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS: origine non autorisée',
      debug: {
        origin: req.headers.origin,
        whitelist: whitelist
      }
    });
  }
  next(err);
});

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