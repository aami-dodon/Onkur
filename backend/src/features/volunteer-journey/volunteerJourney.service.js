const logger = require('../../utils/logger');
const { sendTemplatedEmail } = require('../email/email.service');
const { findUserById } = require('../auth/auth.repository');
const { attachApprovedSponsors, attachSponsorPerspective } = require('../sponsors/sponsor.service');
const {
  getVolunteerProfile,
  upsertVolunteerProfile,
  ensureSkillOption,
  ensureInterestOption,
  listSkillOptions,
  listInterestOptions,
  listAvailabilityOptions,
  listStates,
  listCitiesByState,
  findAvailabilityOption,
  findStateByCode,
  findCityBySlug,
  listPublishedEvents,
  findEventById,
  createEventSignup,
  cancelEventSignup,
  hasSignup,
  listSignupsForUser,
  logVolunteerHours,
  listVolunteerHours,
  getTotalMinutesForUser,
  findSignupsNeedingReminder,
  markReminderSent,
  getUpcomingEventsForUser,
  getPastEventsForUser,
} = require('./volunteerJourney.repository');

const BADGES = [
  {
    slug: 'seedling',
    label: 'Seedling',
    description: 'Logged 10 hours of verified community support.',
    thresholdMinutes: 10 * 60,
  },
  {
    slug: 'grove-guardian',
    label: 'Grove Guardian',
    description: 'Logged 50 hours nurturing sustainable change.',
    thresholdMinutes: 50 * 60,
  },
  {
    slug: 'forest-champion',
    label: 'Forest Champion',
    description: 'Logged 100 hours of environmental stewardship.',
    thresholdMinutes: 100 * 60,
  },
];

let reminderInterval = null;

function normalizeStringArray(value) {
  if (!value) {
    return [];
  }
  const input = Array.isArray(value)
    ? value
    : String(value)
        .split(',')
        .map((segment) => segment.trim());
  const seen = new Set();
  const result = [];
  input.forEach((item) => {
    if (item === null || item === undefined) {
      return;
    }
    const normalized = String(item).trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
}

function sanitizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text.length ? text : null;
}

function normalizeLookupValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function normalizeStateCode(value) {
  const normalized = normalizeLookupValue(value);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeSlug(value) {
  const normalized = normalizeLookupValue(value);
  return normalized ? normalized.toLowerCase() : null;
}

function toTitleCase(value) {
  if (!value) {
    return '';
  }
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function toIsoOrNull(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function mapProfileRow(row, fallbackUserId) {
  if (!row) {
    return {
      userId: fallbackUserId,
      skills: [],
      interests: [],
      availability: '',
      availabilityLabel: '',
      stateCode: '',
      stateName: '',
      citySlug: '',
      cityName: '',
      location: '',
      bio: '',
      createdAt: null,
      updatedAt: null,
    };
  }
  const stateCode = row.state_code || '';
  const citySlug = row.city_slug || '';
  const stateName = row.state_name || '';
  const cityName = row.city_name || '';
  const combinedLocation = row.location
    ? row.location
    : cityName && stateName
    ? `${cityName}, ${stateName}`
    : cityName || stateName || '';
  return {
    userId: row.user_id,
    skills: Array.isArray(row.skills) ? row.skills : [],
    interests: Array.isArray(row.interests) ? row.interests : [],
    availability: row.availability || '',
    availabilityLabel: row.availability_label || '',
    stateCode,
    stateName,
    citySlug,
    cityName,
    location: combinedLocation,
    bio: row.bio || '',
    createdAt: toIsoOrNull(row.created_at),
    updatedAt: toIsoOrNull(row.updated_at),
  };
}

function mapEventRow(event) {
  const signupCount = Number(event.signup_count || 0);
  const hasAvailable = event.available_slots !== undefined && event.available_slots !== null;
  const availableSlots = hasAvailable ? Number(event.available_slots) : Math.max(event.capacity - signupCount, 0);
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    theme: event.theme,
    dateStart: toIsoOrNull(event.date_start),
    dateEnd: toIsoOrNull(event.date_end),
    location: event.location,
    capacity: event.capacity,
    requirements: event.requirements || '',
    status: event.status,
    signupCount,
    availableSlots,
    isFull: availableSlots <= 0,
    isRegistered: Boolean(event.is_registered),
    sponsors: Array.isArray(event.sponsors) ? event.sponsors : [],
    mySponsorship: event.mySponsorship || null,
  };
}

function mapSignupRow(row) {
  const signupCount = Number(row.signup_count || 0);
  const hasAvailable = row.available_slots !== undefined && row.available_slots !== null;
  const availableSlots = hasAvailable ? Number(row.available_slots) : Math.max(row.capacity - signupCount, 0);
  const assignments = Array.isArray(row.assignments)
    ? row.assignments.map((assignment) => ({
        assignmentId: assignment.assignmentId,
        taskId: assignment.taskId,
        taskTitle: assignment.taskTitle,
        taskDescription: assignment.taskDescription || '',
        status: assignment.status,
        createdAt: toIsoOrNull(assignment.createdAt),
        updatedAt: toIsoOrNull(assignment.updatedAt),
      }))
    : [];
  const attendance = row.attendance
    ? {
        id: row.attendance.id,
        checkInAt: toIsoOrNull(row.attendance.check_in_at || row.attendance.checkInAt),
        checkOutAt: toIsoOrNull(row.attendance.check_out_at || row.attendance.checkOutAt),
        minutes: row.attendance.minutes ?? null,
        hoursEntryId: row.attendance.hours_entry_id || row.attendance.hoursEntryId || null,
        createdAt: toIsoOrNull(row.attendance.created_at || row.attendance.createdAt),
        updatedAt: toIsoOrNull(row.attendance.updated_at || row.attendance.updatedAt),
      }
    : null;
  return {
    id: row.id,
    eventId: row.event_id,
    status: row.status,
    createdAt: toIsoOrNull(row.created_at),
    reminderSentAt: toIsoOrNull(row.reminder_sent_at),
    event: {
      id: row.event_id,
      title: row.title,
      description: row.description,
      category: row.category,
      theme: row.theme,
      dateStart: toIsoOrNull(row.date_start),
      dateEnd: toIsoOrNull(row.date_end),
      location: row.location,
      capacity: row.capacity,
      requirements: row.requirements || '',
      signupCount,
      availableSlots,
    },
    assignments,
    attendance,
  };
}

function mapHourRow(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    minutes: row.minutes,
    note: row.note || '',
    verifiedBy: row.verified_by || null,
    createdAt: toIsoOrNull(row.created_at),
    event: row.event_id
      ? {
          id: row.event_id,
          title: row.event_title || null,
          dateStart: toIsoOrNull(row.event_date_start),
          dateEnd: toIsoOrNull(row.event_date_end),
        }
      : null,
  };
}

function formatEventDateRange(event) {
  const start = event.date_start ? new Date(event.date_start) : null;
  const end = event.date_end ? new Date(event.date_end) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return '';
  }
  const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
  const timeFormatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'short' });
  if (end && !Number.isNaN(end.getTime()) && start.toDateString() === end.toDateString()) {
    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
  }
  if (end && !Number.isNaN(end.getTime())) {
    return `${dateFormatter.format(start)} ${timeFormatter.format(start)} → ${dateFormatter.format(end)} ${timeFormatter.format(end)}`;
  }
  return `${dateFormatter.format(start)} ${timeFormatter.format(start)}`;
}

function computeBadges(entries) {
  const sorted = [...entries].sort((a, b) => {
    const aTime = new Date(a.created_at || a.createdAt || 0).getTime();
    const bTime = new Date(b.created_at || b.createdAt || 0).getTime();
    return aTime - bTime;
  });
  let cumulative = 0;
  const progress = BADGES.map((badge) => ({
    ...badge,
    thresholdHours: badge.thresholdMinutes / 60,
    earned: false,
    earnedAt: null,
  }));

  sorted.forEach((entry) => {
    cumulative += Number(entry.minutes || 0);
    progress.forEach((badge) => {
      if (!badge.earned && cumulative >= badge.thresholdMinutes) {
        badge.earned = true;
        badge.earnedAt = toIsoOrNull(entry.created_at || entry.createdAt);
      }
    });
  });

  return { badges: progress, totalMinutes: cumulative };
}

async function getProfile(userId) {
  const row = await getVolunteerProfile(userId);
  return mapProfileRow(row, userId);
}

async function updateProfile({ userId, skills, interests, availability, stateCode, citySlug, bio }) {
  const normalizedSkills = normalizeStringArray(skills);
  const normalizedInterests = normalizeStringArray(interests);
  const normalizedAvailability = normalizeSlug(availability);
  const normalizedStateCode = normalizeStateCode(stateCode);
  const normalizedCitySlug = normalizeSlug(citySlug);
  const sanitizedBio = sanitizeText(bio);

  await Promise.all(
    normalizedSkills.map((value) => ensureSkillOption({ value, label: toTitleCase(value) }))
  );
  await Promise.all(
    normalizedInterests.map((value) => ensureInterestOption({ value, label: toTitleCase(value) }))
  );

  let availabilityValue = null;
  if (normalizedAvailability) {
    const option = await findAvailabilityOption(normalizedAvailability);
    if (!option) {
      throw Object.assign(new Error('Select an availability option from the list'), { statusCode: 400 });
    }
    availabilityValue = option.value;
  }

  let stateRecord = null;
  if (normalizedStateCode) {
    stateRecord = await findStateByCode(normalizedStateCode);
    if (!stateRecord) {
      throw Object.assign(new Error('Select a valid state from the list'), { statusCode: 400 });
    }
  }

  let cityRecord = null;
  if (normalizedCitySlug) {
    cityRecord = await findCityBySlug(normalizedCitySlug);
    if (!cityRecord) {
      throw Object.assign(new Error('Select a valid city from the list'), { statusCode: 400 });
    }
  }

  if (cityRecord && stateRecord && cityRecord.state_code !== stateRecord.code) {
    throw Object.assign(new Error('Select a city within your chosen state'), { statusCode: 400 });
  }

  if (cityRecord && !stateRecord) {
    stateRecord = await findStateByCode(cityRecord.state_code);
  }

  const locationDisplay = cityRecord
    ? `${cityRecord.name}${stateRecord ? `, ${stateRecord.name}` : ''}`
    : stateRecord
    ? stateRecord.name
    : null;
  const sanitizedLocation = sanitizeText(locationDisplay);

  const updated = await upsertVolunteerProfile({
    userId,
    skills: normalizedSkills,
    interests: normalizedInterests,
    availability: availabilityValue,
    stateCode: stateRecord ? stateRecord.code : null,
    citySlug: cityRecord ? cityRecord.slug : null,
    location: sanitizedLocation,
    bio: sanitizedBio,
  });

  logger.info('Volunteer profile updated', {
    userId,
    skillsCount: normalizedSkills.length,
    interestsCount: normalizedInterests.length,
    stateCode: stateRecord ? stateRecord.code : null,
    citySlug: cityRecord ? cityRecord.slug : null,
    availability: availabilityValue || null,
  });

  const fresh = await getVolunteerProfile(userId);
  return mapProfileRow(fresh, userId);
}

async function getProfileLookups() {
  const [skillRows, interestRows, availabilityRows, stateRows] = await Promise.all([
    listSkillOptions(),
    listInterestOptions(),
    listAvailabilityOptions(),
    listStates(),
  ]);

  return {
    skills: skillRows.map((row) => ({ value: row.value, label: row.label })),
    interests: interestRows.map((row) => ({ value: row.value, label: row.label })),
    availability: availabilityRows.map((row) => ({ value: row.value, label: row.label })),
    states: stateRows.map((row) => ({ value: row.code, label: row.name })),
  };
}

async function getCitiesForState(stateCode) {
  const normalizedStateCode = normalizeStateCode(stateCode);
  if (!normalizedStateCode) {
    throw Object.assign(new Error('State code is required'), { statusCode: 400 });
  }
  const state = await findStateByCode(normalizedStateCode);
  if (!state) {
    throw Object.assign(new Error('State not found'), { statusCode: 404 });
  }
  const cities = await listCitiesByState(state.code);
  return {
    state: { value: state.code, label: state.name },
    cities: cities.map((city) => ({ value: city.slug, label: city.name })),
  };
}

async function browseEvents(filters = {}, { userId = null } = {}) {
  let events = await listPublishedEvents(filters, { forUserId: userId });
  events = await attachApprovedSponsors(events);
  events = await attachSponsorPerspective({ events, sponsorId: userId });
  return events.map((event) => {
    const mapped = mapEventRow(event);
    if (userId) {
      mapped.isRegistered = Boolean(event.is_registered || event.is_registered === true);
    }
    return mapped;
  });
}

async function signupForEvent({ eventId, user }) {
  if (!eventId) {
    throw Object.assign(new Error('Event identifier is required'), { statusCode: 400 });
  }
  const { event, signup } = await createEventSignup({ eventId, userId: user.id });

  let manager = null;
  if (event.created_by) {
    try {
      manager = await findUserById(event.created_by);
    } catch (error) {
      logger.error('Failed to load event manager for signup notification', {
        error: error.message,
        eventId,
        managerId: event.created_by,
      });
    }
  }

  let emailDispatched = false;
  let managerEmailDispatched = false;
  try {
    await sendTemplatedEmail({
      to: user.email,
      subject: `You\u2019re confirmed for ${event.title}`,
      heading: 'See you at the event!',
      bodyLines: [
        `Hi ${user.name || 'there'},`,
        `Thank you for signing up for <strong>${event.title}</strong>.`,
        `When: ${formatEventDateRange(event)}`,
        `Where: ${event.location}`,
        'Add the event to your calendar and get ready to make an impact.',
      ],
      cta: null,
      previewText: `Confirmed for ${event.title}`,
    });
    emailDispatched = true;
  } catch (error) {
    logger.error('Failed to send signup confirmation email', {
      error: error.message,
      userId: user.id,
      eventId,
    });
  }

  const freshEvent = await findEventById(eventId);

  if (manager && manager.email) {
    const volunteerName = user.name ? user.name.split(' ')[0] : 'A volunteer';
    const managerName = manager.name ? manager.name.split(' ')[0] : 'there';
    const bodyLines = [
      `Hi ${managerName},`,
      `${volunteerName} just joined <strong>${event.title}</strong>.`,
      `When: ${formatEventDateRange(freshEvent || event)}`,
    ];
    if (event.location) {
      bodyLines.push(`Where: ${event.location}`);
    }
    if (freshEvent && typeof freshEvent.signup_count === 'number') {
      bodyLines.push(`Total registered volunteers: ${freshEvent.signup_count}`);
    }
    bodyLines.push('Review the roster and assignments from your event workspace.');

    try {
      await sendTemplatedEmail({
        to: manager.email,
        subject: `${volunteerName} just joined ${event.title}`,
        heading: 'A new volunteer is on board',
        bodyLines,
        cta: null,
        previewText: `${volunteerName} joined ${event.title}`,
      });
      managerEmailDispatched = true;
    } catch (error) {
      logger.error('Failed to send manager signup notification email', {
        error: error.message,
        userId: user.id,
        managerId: manager.id,
        eventId,
      });
    }
  }

  logger.info('Volunteer signed up for event', {
    userId: user.id,
    eventId,
    emailDispatched,
    managerEmailDispatched,
  });

  return {
    signup: {
      id: signup.id,
      eventId: signup.event_id,
      status: signup.status,
      createdAt: toIsoOrNull(signup.created_at),
    },
    event: mapEventRow({ ...freshEvent, is_registered: true }),
    emailDispatched,
    managerEmailDispatched,
  };
}

async function leaveEvent({ eventId, user }) {
  if (!eventId) {
    throw Object.assign(new Error('Event identifier is required'), { statusCode: 400 });
  }

  const cancellation = await cancelEventSignup({ eventId, userId: user.id });
  const { manager } = cancellation;

  let emailDispatched = false;
  if (manager?.email) {
    const managerFirstName = manager.name ? manager.name.split(' ')[0] : 'there';
    const volunteerName = user.name || 'A volunteer';
    try {
      await sendTemplatedEmail({
        to: manager.email,
        subject: `${volunteerName} left ${cancellation.event.title}`,
        heading: 'Volunteer departure notice',
        bodyLines: [
          `Hi ${managerFirstName},`,
          `${volunteerName} just left <strong>${cancellation.event.title}</strong>.`,
          `When: ${formatEventDateRange(cancellation.event)}`,
          `Where: ${cancellation.event.location}`,
          'Their logged hours for this event have been reset to 0 so you can plan coverage accordingly.',
        ],
        cta: null,
        previewText: `${volunteerName} left ${cancellation.event.title}`,
      });
      emailDispatched = true;
    } catch (error) {
      logger.warn('Failed to send event departure notice', {
        error: error.message,
        managerId: manager.id || null,
        eventId,
        userId: user.id,
      });
    }
  } else {
    logger.warn('No manager email available for event departure notice', {
      eventId,
      userId: user.id,
    });
  }

  const freshEvent = await findEventById(eventId);

  logger.info('Volunteer left event', {
    userId: user.id,
    eventId,
    managerId: manager?.id || null,
    removedMinutes: cancellation.removedMinutes,
    emailDispatched,
  });

  return {
    event: freshEvent ? mapEventRow({ ...freshEvent, is_registered: false }) : null,
    removedMinutes: cancellation.removedMinutes,
    emailDispatched,
  };
}

async function listMySignups(userId) {
  const rows = await listSignupsForUser(userId);
  const now = Date.now();
  return rows.map((row) => {
    const mapped = mapSignupRow(row);
    const eventEnd = row.date_end ? new Date(row.date_end).getTime() : null;
    mapped.isUpcoming = eventEnd === null || Number.isNaN(eventEnd) ? true : eventEnd >= now;
    return mapped;
  });
}

async function recordVolunteerHours({ userId, eventId, minutes, note }) {
  const normalizedMinutes = Number(minutes);
  if (!Number.isFinite(normalizedMinutes) || normalizedMinutes <= 0) {
    throw Object.assign(new Error('Logged minutes must be greater than zero'), { statusCode: 400 });
  }
  if (!eventId) {
    throw Object.assign(new Error('Event identifier is required to log hours'), { statusCode: 400 });
  }

  const hasRegistration = await hasSignup({ userId, eventId });
  if (!hasRegistration) {
    throw Object.assign(new Error('You must join the event before logging hours'), { statusCode: 400 });
  }

  const entry = await logVolunteerHours({
    userId,
    eventId,
    minutes: Math.round(normalizedMinutes),
    note: sanitizeText(note),
  });

  logger.info('Volunteer hours recorded', {
    userId,
    eventId,
    minutes: Math.round(normalizedMinutes),
  });

  return mapHourRow(entry);
}

async function getVolunteerHours(userId) {
  const entries = await listVolunteerHours(userId);
  const mappedEntries = entries.map(mapHourRow);
  const totals = computeBadges(entries);
  const dbTotalMinutes = await getTotalMinutesForUser(userId);
  const totalMinutes = Math.max(totals.totalMinutes, dbTotalMinutes);
  const totalHours = totalMinutes / 60;

  return {
    totalMinutes,
    totalHours,
    badges: totals.badges.map((badge) => ({
      slug: badge.slug,
      label: badge.label,
      description: badge.description,
      thresholdHours: badge.thresholdHours,
      earned: badge.earned,
      earnedAt: badge.earnedAt,
    })),
    entries: mappedEntries,
  };
}

async function getVolunteerDashboard(userId) {
  const [profile, upcoming, past, hours] = await Promise.all([
    getProfile(userId),
    getUpcomingEventsForUser(userId),
    getPastEventsForUser(userId),
    getVolunteerHours(userId),
  ]);

  const mapSimpleEvent = (row) => ({
    id: row.id,
    title: row.title,
    dateStart: toIsoOrNull(row.date_start),
    dateEnd: toIsoOrNull(row.date_end),
    location: row.location,
    theme: row.theme,
    category: row.category,
    joinedAt: toIsoOrNull(row.signup_created_at),
  });

  const upcomingEvents = upcoming.map(mapSimpleEvent);
  const pastEvents = past.map(mapSimpleEvent);

  return {
    profile,
    upcomingEvents,
    pastEvents,
    stats: {
      totalMinutes: hours.totalMinutes,
      totalHours: hours.totalHours,
      upcomingCount: upcomingEvents.length,
      pastCount: pastEvents.length,
    },
    achievements: hours.badges,
    recentHours: hours.entries.slice(0, 5),
  };
}

async function dispatchEventReminders() {
  try {
    const pending = await findSignupsNeedingReminder();
    if (!pending.length) {
      return { processed: 0 };
    }
    let processed = 0;
    for (const signup of pending) {
      try {
        await sendTemplatedEmail({
          to: signup.email,
          subject: `Reminder: ${signup.title} starts soon`,
          heading: 'Your event is almost here',
          bodyLines: [
            `Hi ${signup.name || 'there'},`,
            `Just a friendly nudge that <strong>${signup.title}</strong> kicks off soon.`,
            `When: ${formatEventDateRange(signup)}`,
            `Where: ${signup.location}`,
            'Reply to this email if you have questions. We are excited to see you there!',
          ],
          previewText: `${signup.title} starts soon`,
        });
        await markReminderSent(signup.id);
        processed += 1;
      } catch (error) {
        logger.error('Failed to dispatch event reminder', {
          error: error.message,
          signupId: signup.id,
          eventId: signup.event_id,
        });
      }
    }
    logger.info('Event reminders processed', { processed });
    return { processed };
  } catch (error) {
    logger.error('Reminder scheduler failed', { error: error.message });
    return { processed: 0, error: error.message };
  }
}

function startReminderScheduler({ intervalMs = 15 * 60 * 1000 } = {}) {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }
  if (reminderInterval) {
    return reminderInterval;
  }
  reminderInterval = setInterval(() => {
    dispatchEventReminders();
  }, intervalMs);
  if (typeof reminderInterval.unref === 'function') {
    reminderInterval.unref();
  }
  dispatchEventReminders();
  return reminderInterval;
}

module.exports = {
  BADGES,
  normalizeStringArray,
  getProfile,
  updateProfile,
  getProfileLookups,
  getCitiesForState,
  browseEvents,
  signupForEvent,
  leaveEvent,
  listMySignups,
  recordVolunteerHours,
  getVolunteerHours,
  getVolunteerDashboard,
  dispatchEventReminders,
  startReminderScheduler,
};
