const express = require('express');
const { authenticate } = require('../auth/auth.middleware');
const {
  getProfile,
  updateProfile,
  browseEvents,
  signupForEvent,
  listMySignups,
  recordVolunteerHours,
  getVolunteerHours,
  getVolunteerDashboard,
  startReminderScheduler,
} = require('./volunteerJourney.service');

const router = express.Router();
const authOnly = authenticate();
const uuidPattern = /^[0-9a-fA-F-]{36}$/;

function parseFilters(query = {}) {
  const filters = {};
  const { category, location, theme, date } = query;

  if (category && String(category).trim()) {
    filters.category = String(category).trim();
  }

  if (location && String(location).trim()) {
    filters.location = String(location).trim();
  }

  if (theme && String(theme).trim()) {
    filters.theme = String(theme).trim();
  }

  if (date && String(date).trim()) {
    const normalized = String(date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw Object.assign(new Error('Date filter must use YYYY-MM-DD format'), { statusCode: 400 });
    }
    filters.date = normalized;
  }

  return filters;
}

router.get('/api/me/profile', authOnly, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.put('/api/me/profile', authOnly, async (req, res) => {
  try {
    const { skills, interests, availability, location, bio } = req.body || {};
    const updated = await updateProfile({
      userId: req.user.id,
      skills,
      interests,
      availability,
      location,
      bio,
    });
    res.json(updated);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/api/events', authOnly, async (req, res) => {
  try {
    const filters = parseFilters(req.query || {});
    const events = await browseEvents(filters, { userId: req.user.id });
    res.json({ events });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/api/events/:eventId/signup', authOnly, async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const result = await signupForEvent({ eventId, user: req.user });
    res.status(201).json(result);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/api/me/signups', authOnly, async (req, res) => {
  try {
    const signups = await listMySignups(req.user.id);
    res.json({ signups });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/api/events/:eventId/hours', authOnly, async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const { minutes, note } = req.body || {};
    const entry = await recordVolunteerHours({
      userId: req.user.id,
      eventId,
      minutes,
      note,
    });
    res.status(201).json({ entry });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/api/me/hours', authOnly, async (req, res) => {
  try {
    const summary = await getVolunteerHours(req.user.id);
    res.json(summary);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/api/me/dashboard', authOnly, async (req, res) => {
  try {
    const dashboard = await getVolunteerDashboard(req.user.id);
    res.json(dashboard);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  startReminderScheduler();
}

module.exports = {
  basePath: '/api',
  router,
};
