const logger = require('../../utils/logger');
const { sendTemplatedEmail } = require('../email/email.service');
const {
  createEvent,
  updateEvent,
  setEventStatus,
  findEventById,
  listEventsForManager,
  replaceEventTasks,
  assignVolunteers,
  recordAttendance,
  listEventSignups,
  listTasksForEvent,
  listAssignmentsForEvent,
  generateEventReport,
  getEventDetail,
  getUserContact,
  listEventCategories,
  findEventCategory,
  upsertEventCategory,
} = require('./eventManagement.repository');
const {
  listSkillOptions,
  listInterestOptions,
  listAvailabilityOptions,
  listStates,
  findStateByCode,
  findCityBySlug,
} = require('../volunteer-journey/volunteerJourney.repository');

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function parseDate(value, label) {
  if (!value) {
    throw Object.assign(new Error(`${label} is required`), { statusCode: 400 });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw Object.assign(new Error(`${label} must be a valid ISO date/time`), { statusCode: 400 });
  }
  return date.toISOString();
}

function ensureCapacity(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw Object.assign(new Error('Capacity must be greater than zero'), { statusCode: 400 });
  }
  return Math.round(num);
}

function toNameSlug(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeStringArray(input) {
  if (!input) {
    return [];
  }
  const list = Array.isArray(input) ? input : [input];
  const cleaned = list
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  return [...new Set(cleaned)];
}

function toBooleanFlag(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  return false;
}

function describeLocation(event) {
  if (!event) {
    return 'Location to be announced';
  }
  const online = toBooleanFlag(event.isOnline ?? event.is_online);
  if (online) {
    return event.location || 'Online event';
  }
  const parts = [];
  if (event.location) {
    parts.push(event.location);
  }
  if (event.cityName && !parts.includes(event.cityName)) {
    parts.push(event.cityName);
  }
  if (event.stateName && !parts.includes(event.stateName)) {
    parts.push(event.stateName);
  }
  const summary = parts.filter(Boolean).join(', ');
  return summary || 'Location to be announced';
}

function normalizeEventPayload(payload = {}) {
  const title = String(payload.title || '').trim();
  const description = String(payload.description || '').trim();
  const categoryLabel = String(
    payload.categoryLabel || payload.category_label || payload.category || '',
  ).trim();
  const categoryValue = String(
    payload.categoryValue || payload.category_value || payload.categoryOption?.value || '',
  ).trim();
  const theme = payload.theme ? String(payload.theme).trim() : null;
  const locationNote = String(
    payload.locationNote || payload.location_note || payload.location || payload.venue || '',
  ).trim();
  const requirements = payload.requirements ? String(payload.requirements).trim() : null;

  if (!title) {
    throw Object.assign(new Error('Title is required'), { statusCode: 400 });
  }
  if (!description) {
    throw Object.assign(new Error('Description is required'), { statusCode: 400 });
  }

  const dateStart = parseDate(payload.dateStart || payload.date_start, 'Start date');
  const dateEnd = parseDate(payload.dateEnd || payload.date_end, 'End date');

  if (new Date(dateEnd).getTime() < new Date(dateStart).getTime()) {
    throw Object.assign(new Error('End date must be after the start date'), { statusCode: 400 });
  }

  const isOnline = toBooleanFlag(payload.isOnline ?? payload.is_online);
  const stateCode = String(payload.stateCode || payload.state_code || '').trim().toUpperCase();
  const citySlug = String(payload.citySlug || payload.city_slug || '').trim();
  if (!isOnline) {
    if (!stateCode) {
      throw Object.assign(new Error('State is required for in-person events'), { statusCode: 400 });
    }
    if (!citySlug) {
      throw Object.assign(new Error('City is required for in-person events'), { statusCode: 400 });
    }
  }

  const capacity = ensureCapacity(payload.capacity);

  return {
    title,
    description,
    categoryInput: {
      value: categoryValue || null,
      label: categoryLabel,
    },
    theme,
    dateStart,
    dateEnd,
    locationNote: locationNote || null,
    isOnline,
    stateCode: stateCode || null,
    citySlug: citySlug || null,
    capacity,
    requirements,
    requiredSkills: normalizeStringArray(payload.requiredSkills || payload.skills),
    requiredInterests: normalizeStringArray(payload.requiredInterests || payload.interests),
    requiredAvailability: normalizeStringArray(
      payload.requiredAvailability || payload.availability,
    ),
  };
}

function mapEvent(event) {
  if (!event) return null;
  return {
    ...event,
    dateStart: toIso(event.dateStart || event.date_start),
    dateEnd: toIso(event.dateEnd || event.date_end),
    publishedAt: toIso(event.publishedAt || event.published_at),
    completedAt: toIso(event.completedAt || event.completed_at),
    createdAt: toIso(event.createdAt || event.created_at),
    updatedAt: toIso(event.updatedAt || event.updated_at),
    requiredSkills: Array.isArray(event.requiredSkills) ? event.requiredSkills : [],
    requiredInterests: Array.isArray(event.requiredInterests) ? event.requiredInterests : [],
    requiredAvailability: Array.isArray(event.requiredAvailability)
      ? event.requiredAvailability
      : [],
    isOnline: Boolean(event.isOnline ?? event.is_online),
  };
}

async function resolveCategory(categoryInput = {}) {
  const value = categoryInput.value ? String(categoryInput.value).trim() : '';
  const label = categoryInput.label ? String(categoryInput.label).trim() : '';

  if (value) {
    const existing = await findEventCategory(value);
    if (existing) {
      if (label && existing.label !== label) {
        const updated = await upsertEventCategory({ value: existing.value, label });
        return updated;
      }
      return existing;
    }
    if (!label) {
      throw Object.assign(new Error('Selected category is no longer available'), {
        statusCode: 400,
      });
    }
    const ensured = await upsertEventCategory({ value, label });
    return ensured;
  }

  if (!label) {
    throw Object.assign(new Error('Category is required'), { statusCode: 400 });
  }

  const slug = toNameSlug(label);
  if (!slug) {
    throw Object.assign(new Error('Category is required'), { statusCode: 400 });
  }

  const ensured = await upsertEventCategory({ value: slug, label });
  return ensured;
}

async function resolveLocation({ isOnline, stateCode, citySlug, locationNote }) {
  if (isOnline) {
    const note = locationNote || 'Online event';
    return {
      isOnline: true,
      stateCode: null,
      citySlug: null,
      locationText: note,
    };
  }

  const normalizedState = String(stateCode || '').trim().toUpperCase();
  const normalizedCity = String(citySlug || '').trim();

  const stateRecord = await findStateByCode(normalizedState);
  if (!stateRecord) {
    throw Object.assign(new Error('Selected state was not found'), { statusCode: 400 });
  }

  const cityRecord = await findCityBySlug(normalizedCity);
  if (!cityRecord || cityRecord.state_code !== stateRecord.code) {
    throw Object.assign(new Error('Selected city was not found in the chosen state'), {
      statusCode: 400,
    });
  }

  const fallbackLocation = `${cityRecord.name}, ${stateRecord.name}`;

  return {
    isOnline: false,
    stateCode: stateRecord.code,
    citySlug: cityRecord.slug,
    locationText: locationNote || fallbackLocation,
  };
}

async function createEventDraft({ payload, actor }) {
  const normalized = normalizeEventPayload(payload);
  const category = await resolveCategory(normalized.categoryInput);
  const location = await resolveLocation({
    isOnline: normalized.isOnline,
    stateCode: normalized.stateCode,
    citySlug: normalized.citySlug,
    locationNote: normalized.locationNote,
  });

  const event = await createEvent({
    title: normalized.title,
    description: normalized.description,
    category: category.label,
    categoryValue: category.value,
    theme: normalized.theme,
    dateStart: normalized.dateStart,
    dateEnd: normalized.dateEnd,
    location: location.locationText,
    stateCode: location.stateCode,
    citySlug: location.citySlug,
    isOnline: location.isOnline,
    capacity: normalized.capacity,
    requirements: normalized.requirements,
    requiredSkills: normalized.requiredSkills,
    requiredInterests: normalized.requiredInterests,
    requiredAvailability: normalized.requiredAvailability,
    createdBy: actor?.id || null,
  });

  logger.info('Event draft created', {
    eventId: event.id,
    createdBy: actor?.id || null,
    categoryValue: category.value,
    isOnline: location.isOnline,
  });
  return mapEvent(event);
}

async function updateEventDetails(eventId, payload) {
  const existing = await findEventById(eventId);
  if (!existing) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }
  const normalized = normalizeEventPayload({ ...existing, ...payload });
  const category = await resolveCategory(normalized.categoryInput);
  const location = await resolveLocation({
    isOnline: normalized.isOnline,
    stateCode: normalized.stateCode,
    citySlug: normalized.citySlug,
    locationNote: normalized.locationNote,
  });
  const event = await updateEvent(eventId, {
    title: normalized.title,
    description: normalized.description,
    category: category.label,
    categoryValue: category.value,
    theme: normalized.theme,
    dateStart: normalized.dateStart,
    dateEnd: normalized.dateEnd,
    location: location.locationText,
    stateCode: location.stateCode,
    citySlug: location.citySlug,
    isOnline: location.isOnline,
    capacity: normalized.capacity,
    requirements: normalized.requirements,
    requiredSkills: normalized.requiredSkills,
    requiredInterests: normalized.requiredInterests,
    requiredAvailability: normalized.requiredAvailability,
  });
  logger.info('Event updated', {
    eventId,
    categoryValue: category.value,
    isOnline: location.isOnline,
  });
  return mapEvent(event);
}

async function publishEvent(eventId, actor) {
  const event = await findEventById(eventId);
  if (!event) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }
  if (event.status === 'PUBLISHED') {
    return mapEvent(event);
  }
  if (event.status === 'COMPLETED') {
    throw Object.assign(new Error('Completed events cannot be republished'), { statusCode: 400 });
  }

  const updated = await setEventStatus(eventId, 'PUBLISHED');

  if (actor?.email) {
    try {
          await sendTemplatedEmail({
            to: actor.email,
            subject: `Your event "${updated.title}" is now live`,
            heading: 'Event published successfully',
            bodyLines: [
              `Great news, ${actor.name?.split(' ')[0] || 'there'}!`,
              `Your event <strong>${updated.title}</strong> has been published and is now visible to volunteers.`,
              `Capacity: ${updated.capacity} · Location: ${describeLocation(updated)}`,
            ],
          });
    } catch (error) {
      logger.warn('Failed to send publish confirmation email', {
        eventId,
        error: error.message,
      });
    }
  }

  return mapEvent(updated);
}

async function completeEvent(eventId) {
  const event = await findEventById(eventId);
  if (!event) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }
  if (event.status === 'COMPLETED') {
    return mapEvent(event);
  }
  const updated = await setEventStatus(eventId, 'COMPLETED');
  return mapEvent(updated);
}

async function getManagerEvents(managerId) {
  const events = await listEventsForManager(managerId);
  return events.map(mapEvent);
}

async function saveEventTasks(eventId, tasks) {
  const list = await replaceEventTasks(eventId, tasks);
  return list;
}

async function getEventTasks(eventId) {
  return listTasksForEvent(eventId);
}

async function getEventAssignments(eventId) {
  return listAssignmentsForEvent(eventId);
}

async function assignVolunteersToTasks(eventId, assignments, actor) {
  const result = await assignVolunteers(eventId, assignments, { assignedBy: actor?.id || null });
  const assignmentDetails = result.assignments;
  const newAssignmentIds = new Set(result.newAssignments.map((item) => item.assignmentId));
  const event = await findEventById(eventId);

  const notifications = assignmentDetails.filter((assignment) => newAssignmentIds.has(assignment.id));

  await Promise.all(
    notifications.map(async (assignment) => {
      if (!assignment.volunteerEmail) {
        return;
      }
      try {
        await sendTemplatedEmail({
          to: assignment.volunteerEmail,
          subject: `You're assigned to ${event.title}`,
          heading: 'New volunteer assignment',
          bodyLines: [
            `Hi ${assignment.volunteerName?.split(' ')[0] || 'there'},`,
            `You've been assigned to <strong>${assignment.taskTitle}</strong> for ${event.title}.`,
            `Location: ${describeLocation(event)}`,
            `Shift window: ${toIso(event.dateStart)} → ${toIso(event.dateEnd)}`,
          ],
        });
      } catch (error) {
        logger.warn('Failed to send assignment email', {
          eventId,
          volunteerId: assignment.userId,
          error: error.message,
        });
      }
    }),
  );

  return assignmentDetails;
}

async function recordVolunteerAttendance(eventId, userId, { action, minutesOverride } = {}) {
  const attendance = await recordAttendance(eventId, userId, { action, minutesOverride });
  const event = await findEventById(eventId);
  const signup = await getUserContact(userId);

  const response = {
    id: attendance.id,
    eventId: attendance.event_id,
    userId: attendance.user_id,
    checkInAt: toIso(attendance.check_in_at),
    checkOutAt: toIso(attendance.check_out_at),
    minutes: attendance.minutes,
    hoursEntryId: attendance.hours_entry_id || null,
    alreadyCheckedIn: Boolean(attendance.alreadyCheckedIn),
    alreadyCheckedOut: Boolean(attendance.alreadyCheckedOut),
  };

  if (signup?.email && action === 'check-out' && !attendance.alreadyCheckedOut) {
    try {
      await sendTemplatedEmail({
        to: signup.email,
        subject: `Thank you for supporting ${event.title}`,
        heading: 'You made a difference today',
        bodyLines: [
          `We appreciate your time at <strong>${event.title}</strong>.`,
          `Total time recorded: ${attendance.minutes || 0} minutes.`,
          'Your contribution keeps our community thriving! 🌱',
        ],
      });
    } catch (error) {
      logger.warn('Failed to send post-event thank you email', {
        eventId,
        volunteerId: userId,
        error: error.message,
      });
    }
  }

  return response;
}

async function getEventSignups(eventId) {
  return listEventSignups(eventId);
}

async function buildReport(eventId) {
  const report = await generateEventReport(eventId);
  const attendancePercentage = report.totals.attendanceRate
    ? Math.round(report.totals.attendanceRate * 10000) / 100
    : 0;
  return {
    event: mapEvent(report.event),
    totals: {
      totalSignups: report.totals.totalSignups,
      totalCheckedIn: report.totals.totalCheckedIn,
      attendanceRate: attendancePercentage,
      totalHours: Math.round(report.totals.totalHours * 100) / 100,
    },
    storedReport: report.storedReport,
  };
}

async function getEventOverview(eventId) {
  const detail = await getEventDetail(eventId);
  return {
    event: mapEvent(detail.event),
    tasks: detail.tasks,
    assignments: detail.assignments,
    signups: detail.signups,
  };
}

async function getEventLookups() {
  const [categoryRows, skillRows, interestRows, availabilityRows, stateRows] = await Promise.all([
    listEventCategories(),
    listSkillOptions(),
    listInterestOptions(),
    listAvailabilityOptions(),
    listStates(),
  ]);

  return {
    categories: categoryRows.map((row) => ({ value: row.value, label: row.label })),
    skills: skillRows.map((row) => ({ value: row.value, label: row.label })),
    interests: interestRows.map((row) => ({ value: row.value, label: row.label })),
    availability: availabilityRows.map((row) => ({ value: row.value, label: row.label })),
    states: stateRows.map((row) => ({ value: row.code, label: row.name })),
  };
}

async function createEventCategory(label) {
  const category = await resolveCategory({ label });
  logger.info('Event category saved', { categoryValue: category.value });
  return category;
}

module.exports = {
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
};
