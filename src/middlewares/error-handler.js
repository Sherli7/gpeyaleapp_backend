// src/middlewares/error-handler.js
'use strict';

const isProd = process.env.NODE_ENV === 'production';

function notFound(_req, res) {
  res.status(404).json({ success: false, message: 'Ressource introuvable' });
}

function errorHandler(err, req, res, _next) {
  const statusFromErr = err?.status || err?.statusCode;

  // ---- Validation (Joi/Zod/Yup) ----
  if (err?.isJoi || err?.name === 'ValidationError' || Array.isArray(err?.issues) || Array.isArray(err?.errors)) {
    const details =
      err.details?.map(d => d.message)
      || err.issues?.map(i => i.message)
      || err.errors?.map(e => e.message || String(e))
      || [];
    return res.status(400).json({ success: false, message: 'Validation échouée', details });
  }

  // ---- JSON invalide (body-parser) ----
  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    return res.status(400).json({ success: false, message: 'JSON invalide dans la requête.' });
  }

  // ---- CORS ----
  if (err?.message && /CORS/i.test(err.message)) {
    const origin = req.headers.origin || 'inconnue';
    return res.status(403).json({ success: false, message: 'CORS: origine non autorisée', details: [`origin: ${origin}`] });
  }

  // ---- Rate limit ----
  if (statusFromErr === 429 || err?.name === 'RateLimitError') {
    return res.status(429).json({ success: false, message: 'Trop de requêtes. Réessayez plus tard.' });
  }

  // ---- PostgreSQL (codes d’erreur) ----
  // 23505: unique_violation   | 23503: foreign_key_violation | 22P02: invalid_text_representation
  if (err?.code) {
    if (err.code === '23505') {
      const emailDup = /email/i.test(err.detail || '') || /email/i.test(err.constraint || '');
      return res.status(409).json({
        success: false,
        message: emailDup ? 'Une candidature avec cet email existe déjà.' : 'Conflit : entrée déjà existante.'
      });
    }
    if (err.code === '23503') {
      return res.status(409).json({ success: false, message: 'Contrainte d’intégrité violée (clé étrangère).' });
    }
    if (err.code === '22P02') {
      return res.status(400).json({ success: false, message: 'Paramètre invalide.' });
    }
  }

  // ---- Erreurs HTTP explicites ----
  if (statusFromErr && statusFromErr >= 400 && statusFromErr < 600) {
    return res.status(statusFromErr).json({ success: false, message: err.message || 'Erreur.' });
  }

  // ---- Journalisation & 500 ----
  console.error('[error]', err?.stack || err);
  const payload = isProd
    ? { success: false, message: 'Erreur interne. Réessayez plus tard.' }
    : { success: false, message: 'Erreur interne. Réessayez plus tard.', details: [err?.message], stack: err?.stack };
  return res.status(500).json(payload);
}

module.exports = { errorHandler, notFound };
