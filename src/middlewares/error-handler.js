module.exports = function errorHandler(err, _req, res, _next) {
  if (err && (err.isJoi || err.name === 'ValidationError')) {
    const details = (err.details || []).map(d => d.message);
    return res.status(400).json({
      success: false,
      message: 'Validation échouée',
      details
    });
  }

  if (err && err.message && /CORS/i.test(err.message)) {
    return res.status(403).json({
      success: false,
      message: 'CORS: origine non autorisée'
    });
  }

  console.error('[error] ', err);
  return res.status(500).json({
    success: false,
    message: 'Erreur interne. Réessayez plus tard.'
  });
};
// Middleware de gestion des erreurs