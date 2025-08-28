module.exports = function validate(schema) {
  return async (req, _res, next) => {
    try {
      const value = await schema.validateAsync(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });
      req.validated = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};
// Middleware de validation des requêtes avec Joi