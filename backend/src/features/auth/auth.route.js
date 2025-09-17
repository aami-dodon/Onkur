const express = require('express');
const {
  signup,
  login,
  logout,
  getProfile,
  listAllUsers,
  assignRole,
  verifyEmail,
  ROLES,
} = require('./auth.service');
const { authenticate, authorizeRoles } = require('./auth.middleware');

const router = express.Router();

const authOnly = authenticate();
const adminOnly = [authOnly, authorizeRoles('ADMIN')];

function sanitizeAuthResponse(result) {
  return {
    token: result.token,
    expiresAt: result.expiresAt,
    jti: result.jti,
    user: result.user,
  };
}

router.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const result = await signup({ name, email, password });
    res.status(201).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body || {};
    const result = await verifyEmail({ token });
    res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const result = await login({ email, password });
    res.status(200).json(sanitizeAuthResponse(result));
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/api/auth/logout', authOnly, async (req, res) => {
  try {
    const { jti, exp } = req.auth.claims;
    const expiresAt = exp ? new Date(exp * 1000).toISOString() : null;
    await logout({ jti, expiresAt, actorId: req.user.id });
    res.status(200).json({ success: true });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/api/me', authOnly, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/api/users', adminOnly, async (req, res) => {
  try {
    const users = await listAllUsers();
    res.json({ users });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.patch('/api/users/:id/role', adminOnly, async (req, res) => {
  try {
    const { role } = req.body || {};
    const userId = req.params.id;
    const updated = await assignRole({ actorId: req.user.id, userId, role });
    res.json({ user: updated });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/api/auth/roles', (_req, res) => {
  res.json({ roles: ROLES });
});

module.exports = {
  basePath: '/',
  router,
};
