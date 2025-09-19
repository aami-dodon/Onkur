const express = require('express');
const { authenticate, authorizeRoles } = require('../auth/auth.middleware');
const {
  getModerationQueue,
  approveEntity,
  rejectEntity,
  updateUser,
  getReportsOverview,
  exportData,
} = require('./admin.service');

const router = express.Router();
const authOnly = authenticate();
const adminOnly = authorizeRoles('ADMIN');
const uuidPattern = /^[0-9a-fA-F-]{36}$/;

router.get('/api/admin/moderation', authOnly, adminOnly, async (req, res) => {
  try {
    const { type } = req.query;
    const queue = await getModerationQueue({ type });
    res.json(queue);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/api/admin/approve/:entityType/:id', authOnly, adminOnly, async (req, res) => {
  try {
    const { entityType, id } = req.params;
    if (!uuidPattern.test(id)) {
      return res.status(400).json({ error: 'Invalid entity identifier' });
    }
    const note = req.body?.note ? String(req.body.note).trim() : null;
    const result = await approveEntity({ entityType, entityId: id, actorId: req.user.id, note });
    res.json({ result });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/api/admin/reject/:entityType/:id', authOnly, adminOnly, async (req, res) => {
  try {
    const { entityType, id } = req.params;
    if (!uuidPattern.test(id)) {
      return res.status(400).json({ error: 'Invalid entity identifier' });
    }
    const note = req.body?.note ? String(req.body.note).trim() : null;
    const result = await rejectEntity({ entityType, entityId: id, actorId: req.user.id, note });
    res.json({ result });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.patch('/api/admin/users/:id', authOnly, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!uuidPattern.test(id)) {
      return res.status(400).json({ error: 'Invalid user identifier' });
    }
    const { roles, isActive } = req.body || {};
    const result = await updateUser({ userId: id, roles, isActive, actorId: req.user.id });
    res.json({ user: result });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/api/admin/reports/overview', authOnly, adminOnly, async (_req, res) => {
  try {
    const overview = await getReportsOverview();
    res.json({ overview });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/api/admin/export', authOnly, adminOnly, async (req, res) => {
  try {
    const { entity, format } = req.query;
    const { content, contentType, extension } = await exportData({ entity, format });
    const baseName =
      typeof entity === 'string' && entity.trim()
        ? entity.trim().replace(/[^a-z0-9_-]/gi, '')
        : 'export';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${baseName || 'export'}-${timestamp}.${extension}`;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

module.exports = {
  basePath: '/',
  router,
};
