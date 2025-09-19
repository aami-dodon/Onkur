const express = require('express');
const { authenticate, authorizeRoles } = require('../auth/auth.middleware');
const {
  submitImpactStory,
  getEventImpactStories,
  getStoryModerationQueue,
  approveImpactStory,
  rejectImpactStory,
  getImpactAnalyticsOverview,
  exportImpactAnalyticsReport,
} = require('./impact.service');

const router = express.Router();
const authOnly = authenticate();
const storytellersOnly = authorizeRoles('VOLUNTEER', 'EVENT_MANAGER', 'SPONSOR', 'ADMIN');
const analyticsRoles = authorizeRoles('VOLUNTEER', 'EVENT_MANAGER', 'SPONSOR', 'ADMIN');
const adminOnly = authorizeRoles('ADMIN');

router.post('/events/:eventId/stories', authOnly, storytellersOnly, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { title, body, mediaIds } = req.body || {};
    const result = await submitImpactStory({
      eventId,
      author: req.user,
      title,
      body,
      mediaIds,
    });
    res.status(201).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/events/:eventId/stories', async (req, res) => {
  try {
    const { eventId } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const stories = await getEventImpactStories({ eventId, limit });
    res.json({ stories });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/impact/stories/moderation', authOnly, adminOnly, async (req, res) => {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const status = req.query.status ? String(req.query.status) : 'PENDING';
    const queue = await getStoryModerationQueue({ page, pageSize, status });
    res.json(queue);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/impact/stories/:storyId/approve', authOnly, adminOnly, async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await approveImpactStory({ storyId, moderator: req.user });
    res.json({ story });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/impact/stories/:storyId/reject', authOnly, adminOnly, async (req, res) => {
  try {
    const { storyId } = req.params;
    const reason = req.body?.reason;
    const story = await rejectImpactStory({ storyId, moderator: req.user, reason });
    res.json({ story });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/analytics/overview', authOnly, analyticsRoles, async (req, res) => {
  try {
    const overview = await getImpactAnalyticsOverview();
    res.json({ overview });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/analytics/overview/report', authOnly, analyticsRoles, async (req, res) => {
  try {
    const { csv, filename } = await exportImpactAnalyticsReport();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

module.exports = {
  basePath: '/api',
  router,
};
