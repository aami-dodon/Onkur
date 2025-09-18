const { verifyToken } = require('./auth.service');

function authenticate() {
  return async function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (!token || scheme !== 'Bearer') {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const { user, claims } = await verifyToken(token);
      req.user = user;
      req.auth = {
        token,
        claims,
      };
      return next();
    } catch (error) {
      const status = error.statusCode || 401;
      return res.status(status).json({ error: error.message });
    }
  };
}

function authorizeRoles(...allowedRoles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userRoles = Array.isArray(req.user.roles) && req.user.roles.length
      ? req.user.roles
      : req.user.role
      ? [req.user.role]
      : [];
    if (!userRoles.some((role) => allowedRoles.includes(role))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles,
};
