const express = require('express');
const { authenticate, authorizeRoles } = require('../auth/auth.middleware');
const {
  getModerationQueue,
  approveEntity,
  rejectEntity,
  getOverviewReport,
  exportEntities,
  updateUserAccount,
} = require('./admin.service');

const router = express.Router();
const authOnly = authenticate();
const adminOnly = authorizeRoles('ADMIN');
const requireAdmin = [authOnly, adminOnly];
const uuidPattern = /^[0-9a-fA-F-]{36}$/;

router.get('/admin/moderation', requireAdmin, async (req, res) => {
  try {
    const queue = await getModerationQueue({ type: req.query?.type });
    res.json(queue);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/admin/approve/:entityType/:id', requireAdmin, async (req, res) => {
  try {
    const { entityType, id } = req.params;
    if (!uuidPattern.test(id)) {
      return res.status(400).json({ error: 'Invalid identifier supplied' });
    }
    const result = await approveEntity({ actorId: req.user.id, entityType, entityId: id });
    res.json({ result });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/admin/reject/:entityType/:id', requireAdmin, async (req, res) => {
  try {
    const { entityType, id } = req.params;
    if (!uuidPattern.test(id)) {
      return res.status(400).json({ error: 'Invalid identifier supplied' });
    }
    const reason = req.body?.reason ? String(req.body.reason).trim() : null;
    const result = await rejectEntity({ actorId: req.user.id, entityType, entityId: id, reason });
    res.json({ result });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.patch('/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!uuidPattern.test(id)) {
      return res.status(400).json({ error: 'Invalid user identifier' });
    }
    const roles = Array.isArray(req.body?.roles)
      ? req.body.roles.map((role) => (typeof role === 'string' ? role.trim().toUpperCase() : '')).filter(Boolean)
      : null;
    const isActive =
      Object.prototype.hasOwnProperty.call(req.body || {}, 'isActive') && typeof req.body.isActive === 'boolean'
        ? req.body.isActive
        : undefined;
    const reason = req.body?.reason ? String(req.body.reason).trim() : null;

    const user = await updateUserAccount({ actorId: req.user.id, userId: id, roles, isActive, reason });
    res.json({ user });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/admin/reports/overview', requireAdmin, async (_req, res) => {
  try {
    const report = await getOverviewReport();
    res.json(report);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/admin/export', requireAdmin, async (req, res) => {
  try {
    const entity = req.query?.entity ? String(req.query.entity).toLowerCase() : null;
    if (!entity) {
      return res.status(400).json({ error: 'Export entity is required' });
    }
    const format = req.query?.format ? String(req.query.format).toLowerCase() : 'csv';
    const { filename, mimeType, buffer } = await exportEntities({ entity, format });
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

module.exports = {
  basePath: '/api',
  router,
};
