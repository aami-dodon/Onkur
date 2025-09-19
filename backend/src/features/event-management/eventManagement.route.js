const express = require('express');
const { authenticate, authorizeRoles } = require('../auth/auth.middleware');
const {
  createEventDraft,
  updateEventDetails,
  publishEvent,
  completeEvent,
  getManagerEvents,
  saveEventTasks,
  getEventTasks,
  getEventAssignments,
  assignVolunteersToTasks,
  recordVolunteerAttendance,
  getEventSignups,
  buildReport,
  getEventOverview,
  getEventLookups,
  createEventCategory,
} = require('./eventManagement.service');

const router = express.Router();
const authOnly = authenticate();
const managerOnly = authorizeRoles('EVENT_MANAGER', 'ADMIN');
const uuidPattern = /^[0-9a-fA-F-]{36}$/;

router.use(authOnly, managerOnly);

router.get('/events/lookups', async (req, res) => {
  try {
    const lookups = await getEventLookups();
    res.json(lookups);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/events/categories', async (req, res) => {
  try {
    const label = String(req.body?.label || '').trim();
    if (!label) {
      return res.status(400).json({ error: 'Category label is required' });
    }
    const category = await createEventCategory(label);
    res.status(201).json({ category });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/events', async (req, res) => {
  try {
    const events = await getManagerEvents(req.user.id);
    res.json({ events });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/events', async (req, res) => {
  try {
    const event = await createEventDraft({ payload: req.body || {}, actor: req.user });
    res.status(201).json({ event });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.patch('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const event = await updateEventDetails(eventId, req.body || {});
    res.json({ event });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/events/:eventId/publish', async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const event = await publishEvent(eventId, req.user);
    res.json({ event });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/events/:eventId/complete', async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const event = await completeEvent(eventId);
    res.json({ event });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const overview = await getEventOverview(eventId);
    res.json(overview);
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/events/:eventId/tasks', async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const tasks = await getEventTasks(eventId);
    res.json({ tasks });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/events/:eventId/tasks', async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const tasksPayload = Array.isArray(req.body?.tasks) ? req.body.tasks : req.body || [];
    const tasks = await saveEventTasks(eventId, tasksPayload);
    res.json({ tasks });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/events/:eventId/assignments', async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const assignments = await getEventAssignments(eventId);
    res.json({ assignments });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/events/:eventId/tasks/assignments', async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const assignmentsPayload = Array.isArray(req.body?.assignments)
      ? req.body.assignments
      : Array.isArray(req.body)
        ? req.body
        : [];
    const assignments = await assignVolunteersToTasks(eventId, assignmentsPayload);
    res.json({ assignments });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/events/:eventId/signups', async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const signups = await getEventSignups(eventId);
    res.json({ signups });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.post('/events/:eventId/check-in/:userId', async (req, res) => {
  try {
    const { eventId, userId } = req.params;
    if (!uuidPattern.test(eventId) || !uuidPattern.test(userId)) {
      return res.status(400).json({ error: 'Invalid identifiers supplied' });
    }
    const { action, minutes } = req.body || {};
    const attendance = await recordVolunteerAttendance(eventId, userId, {
      action: action || 'check-in',
      minutesOverride: minutes,
    });
    res.json({ attendance });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

router.get('/events/:eventId/report', async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!uuidPattern.test(eventId)) {
      return res.status(400).json({ error: 'Invalid event identifier' });
    }
    const report = await buildReport(eventId);
    if ((req.query.format || '').toLowerCase() === 'csv') {
      const rows = [
        ['Metric', 'Value'],
        ['Event Title', report.event.title],
        ['Start', report.event.dateStart],
        ['End', report.event.dateEnd],
        ['Total Signups', report.totals.totalSignups],
        ['Checked In', report.totals.totalCheckedIn],
        ['Attendance %', `${report.totals.attendanceRate}`],
        ['Total Hours', report.totals.totalHours],
      ];
      const csv = rows
        .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-report.csv"`);
      return res.send(csv);
    }
    res.json({ report });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message });
  }
});

module.exports = {
  basePath: '/api/manager',
  router,
};
