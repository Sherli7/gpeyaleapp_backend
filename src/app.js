// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const candidatureRoutes = require('./routes/candidatures.routes'); // ✅ Router
const { errorHandler, notFound } = require('./middlewares/error-handler');       // ✅ Middleware

const app = express();

/* ---------------- trust proxy (IMPORTANT pour express-rate-limit) ----------------
   Configure via env TRUST_PROXY :
   - "1"   (défaut) : 1 proxy (Nginx local, le cas le plus courant)
   - "true": plusieurs proxies (Cloudflare, etc.)
   - "false": aucun proxy (rare)
   - "2" / "3" … : nombre de proxies
   - "127.0.0.1,::1" : liste d'IPs/masques à faire confiance
--------------------------------------------------------------------------------- */
function resolveTrustProxyEnv() {
  const raw = (process.env.TRUST_PROXY ?? '1').trim(); // ⚙️ défaut: 1
  if (raw === '') return 1;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}
const trustProxy = resolveTrustProxyEnv();
app.set('trust proxy', trustProxy);
console.log('[server] trust proxy =', app.get('trust proxy'));

/* Si aucun proxy n’est approuvé ET que des clients envoient X-Forwarded-For,
   express-rate-limit v7 déclenchera une ValidationError. On neutralise ce header
   uniquement dans ce cas (plan B). */
if (!app.get('trust proxy')) {
  app.use((req, _res, next) => {
    if ('x-forwarded-for' in req.headers) {
      delete req.headers['x-forwarded-for'];
    }
    next();
  });
}

/* ---------------- Sécurité / parsing ---------------- */
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

/* ---------------- CORS ---------------- */
const parseOrigins = (str) =>
  (!str ? [] : str.split(',').map(s => s.trim()).filter(Boolean));
const whitelist = parseOrigins(process.env.CORS_ORIGINS);

const corsOptions = {
  origin: (origin, cb) => {
    // Autoriser les requêtes sans origin (curl, healthchecks…)
    if (!origin) return cb(null, true);

    if (whitelist.includes(origin)) return cb(null, true);

    // Log debug
    console.log(`[CORS] Origine rejetée: ${origin}`);
    console.log(`[CORS] Whitelist: ${whitelist.join(', ')}`);

    return cb(new Error('Origine non autorisée par CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Gestion propre des erreurs CORS
app.use((err, req, res, next) => {
  if (err && err.message === 'Origine non autorisée par CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS: origine non autorisée',
      debug: { origin: req.headers.origin, whitelist }
    });
  }
  next(err);
});

/* ---------------- Rate limit (après trust proxy !) ---------------- */
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
}));

/* ---------------- Routes ---------------- */
app.use('/api/candidatures', candidatureRoutes);

/* ---------------- Health ---------------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ---------------- Erreurs ---------------- */
app.use(errorHandler);

module.exports = app;
// Application Express principale
