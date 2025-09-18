const express = require('express');
const { authenticate } = require('../auth/auth.middleware');
const {
  getProfile,
  getProfileCatalogs,
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

router.get('/me/profile', authOnly, async (req, res) => {
  try {
    const [profile, catalogs] = await Promise.all([
      getProfile(req.user.id),
      getProfileCatalogs(),
    ]);
    res.json({ profile, catalogs });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.put('/me/profile', authOnly, async (req, res) => {
  try {
    const { skills, interests, availability, location, state, bio } = req.body || {};
    const updated = await updateProfile({
      userId: req.user.id,
      skills,
      interests,
      availability,
      location,
      state,
      bio,
    });
    const catalogs = await getProfileCatalogs();
    res.json({ profile: updated, catalogs });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/events', authOnly, async (req, res) => {
  try {
    const filters = parseFilters(req.query || {});
    const events = await browseEvents(filters, { userId: req.user.id });
    res.json({ events });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/events/:eventId/signup', authOnly, async (req, res) => {
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

router.get('/me/signups', authOnly, async (req, res) => {
  try {
    const signups = await listMySignups(req.user.id);
    res.json({ signups });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/events/:eventId/hours', authOnly, async (req, res) => {
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

router.get('/me/hours', authOnly, async (req, res) => {
  try {
    const summary = await getVolunteerHours(req.user.id);
    res.json(summary);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/me/dashboard', authOnly, async (req, res) => {
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
