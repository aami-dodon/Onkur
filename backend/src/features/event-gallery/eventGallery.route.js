const express = require('express');
const multer = require('multer');
const { authenticate, authorizeRoles } = require('../auth/auth.middleware');
const {
  uploadMediaForEvent,
  getEventGallery,
  listEventsWithGalleries,
  getModerationQueue,
  moderateMedia,
  getTagOptions,
} = require('./eventGallery.service');

const router = express.Router();
const authOnly = authenticate();
const adminOnly = authorizeRoles('ADMIN');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uuidPattern = /^[0-9a-fA-F-]{36}$/;

router.get('/events/:eventId/media', async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const gallery = await getEventGallery({ eventId, page, pageSize });
    res.json(gallery);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/events/:eventId/media/tags', authOnly, async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const options = await getTagOptions(eventId);
    res.json(options);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/events/:eventId/media', authOnly, upload.single('file'), async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'A photo file is required' });
    }
    const media = await uploadMediaForEvent({
      eventId,
      file: req.file,
      caption: req.body?.caption,
      tags: req.body?.tags,
      user: req.user,
    });
    res.status(201).json({ media });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/media/events', async (req, res) => {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const events = await listEventsWithGalleries({ page, pageSize });
    res.json(events);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/media/moderation', authOnly, adminOnly, async (req, res) => {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;
    const queue = await getModerationQueue({ page, pageSize });
    res.json(queue);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/media/:mediaId/approve', authOnly, adminOnly, async (req, res) => {
  try {
    const { mediaId } = req.params;
    if (!uuidPattern.test(mediaId)) {
      return res.status(400).json({ error: 'Invalid media identifier' });
    }
    const media = await moderateMedia({ mediaId, action: 'approve', moderatorId: req.user.id });
    res.json({ media });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/media/:mediaId/reject', authOnly, adminOnly, async (req, res) => {
  try {
    const { mediaId } = req.params;
    if (!uuidPattern.test(mediaId)) {
      return res.status(400).json({ error: 'Invalid media identifier' });
    }
    const reason = req.body?.reason ? String(req.body.reason).trim() : '';
    const media = await moderateMedia({ mediaId, action: 'reject', moderatorId: req.user.id, reason });
    res.json({ media });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

module.exports = {
  basePath: '/api',
  router,
};
