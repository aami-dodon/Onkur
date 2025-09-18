const logger = require('../../utils/logger');
const { sendTemplatedEmail } = require('../email/email.service');
const {
  getVolunteerProfile,
  upsertVolunteerProfile,
  listPublishedEvents,
  findEventById,
  createEventSignup,
  hasSignup,
  listSignupsForUser,
  logVolunteerHours,
  listVolunteerHours,
  getTotalMinutesForUser,
  findSignupsNeedingReminder,
  markReminderSent,
  getUpcomingEventsForUser,
  getPastEventsForUser,
  listProfileOptions,
  insertProfileOptions,
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

const PROFILE_OPTION_TYPES = {
  SKILL: 'skill',
  INTEREST: 'interest',
  CITY: 'city',
};

const DEFAULT_PROFILE_OPTIONS = {
  [PROFILE_OPTION_TYPES.SKILL]: [
    'tree planting',
    'first aid',
    'event coordination',
    'community outreach',
    'waste management',
    'teaching',
  ],
  [PROFILE_OPTION_TYPES.INTEREST]: [
    'urban forestry',
    'wetland restoration',
    'environmental education',
    'wildlife rescue',
    'climate advocacy',
    'sustainable farming',
  ],
  [PROFILE_OPTION_TYPES.CITY]: ['Bengaluru', 'Chennai', 'Delhi', 'Hyderabad', 'Kolkata', 'Mumbai', 'Pune'],
};

const AVAILABILITY_PRESETS = [
  { value: 'weekday-mornings', label: 'Weekday mornings' },
  { value: 'weekday-afternoons', label: 'Weekday afternoons' },
  { value: 'weekday-evenings', label: 'Weekday evenings' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'flexible', label: 'Flexible / on-call' },
  { value: 'remote', label: 'Remote friendly' },
];

const AVAILABILITY_LOOKUP = new Map();
AVAILABILITY_PRESETS.forEach((option) => {
  AVAILABILITY_LOOKUP.set(option.value, option.value);
  AVAILABILITY_LOOKUP.set(option.label.toLowerCase(), option.value);
});

const STATE_OPTIONS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

const STATE_LOOKUP = new Map(STATE_OPTIONS.map((state) => [state.toLowerCase(), state]));

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

function toTitleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeCity(value) {
  const sanitized = sanitizeText(value);
  if (!sanitized) {
    return null;
  }
  return toTitleCase(sanitized);
}

function normalizeAvailabilityArray(value) {
  if (value === null || value === undefined) {
    return [];
  }
  const input = Array.isArray(value)
    ? value
    : String(value)
        .split(',')
        .map((segment) => segment.trim());

  const seen = new Set();
  const normalized = [];

  input.forEach((item) => {
    if (item === null || item === undefined) {
      return;
    }
    const key = String(item).trim();
    if (!key) {
      return;
    }
    const lookupKey = key.toLowerCase();
    const canonical = AVAILABILITY_LOOKUP.get(lookupKey) || AVAILABILITY_LOOKUP.get(key);
    if (!canonical) {
      throw Object.assign(new Error(`Unsupported availability option: ${key}`), { statusCode: 400 });
    }
    if (!seen.has(canonical)) {
      seen.add(canonical);
      normalized.push(canonical);
    }
  });

  return normalized;
}

function normalizeState(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const key = String(value).trim();
  if (!key) {
    return null;
  }
  const canonical = STATE_LOOKUP.get(key.toLowerCase());
  if (!canonical) {
    throw Object.assign(new Error('Please select a valid state in India'), { statusCode: 400 });
  }
  return canonical;
}

async function ensureDefaultProfileOptions() {
  const defaultSkillValues = DEFAULT_PROFILE_OPTIONS[PROFILE_OPTION_TYPES.SKILL].map((value) => value.toLowerCase());
  const defaultInterestValues = DEFAULT_PROFILE_OPTIONS[PROFILE_OPTION_TYPES.INTEREST].map((value) => value.toLowerCase());
  const defaultCityValues = DEFAULT_PROFILE_OPTIONS[PROFILE_OPTION_TYPES.CITY]
    .map((value) => normalizeCity(value))
    .filter(Boolean);

  await Promise.all([
    insertProfileOptions(PROFILE_OPTION_TYPES.SKILL, defaultSkillValues),
    insertProfileOptions(PROFILE_OPTION_TYPES.INTEREST, defaultInterestValues),
    insertProfileOptions(PROFILE_OPTION_TYPES.CITY, defaultCityValues),
  ]);
}

function formatOptionLabel(type, value) {
  if (!value) {
    return '';
  }
  return toTitleCase(value);
}

function normalizeCityValues(values) {
  const input = Array.isArray(values) ? values : [values];
  const seen = new Set();
  const normalized = [];
  input.forEach((item) => {
    const normalizedValue = normalizeCity(item);
    if (normalizedValue && !seen.has(normalizedValue)) {
      seen.add(normalizedValue);
      normalized.push(normalizedValue);
    }
  });
  return normalized;
}

async function getProfileCatalogs() {
  await ensureDefaultProfileOptions();
  const rows = await listProfileOptions();
  const grouped = {
    [PROFILE_OPTION_TYPES.SKILL]: new Set(),
    [PROFILE_OPTION_TYPES.INTEREST]: new Set(),
    [PROFILE_OPTION_TYPES.CITY]: new Set(),
  };

  rows.forEach((row) => {
    if (grouped[row.type]) {
      grouped[row.type].add(row.value);
    }
  });

  const toSortedOptions = (type) =>
    Array.from(grouped[type])
      .map((value) => ({ value, label: formatOptionLabel(type, value) }))
      .sort((a, b) => a.label.localeCompare(b.label));

  return {
    skills: toSortedOptions(PROFILE_OPTION_TYPES.SKILL),
    interests: toSortedOptions(PROFILE_OPTION_TYPES.INTEREST),
    locations: toSortedOptions(PROFILE_OPTION_TYPES.CITY),
    availability: AVAILABILITY_PRESETS.slice(),
    states: STATE_OPTIONS.map((state) => ({ value: state, label: state })),
  };
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
      availability: [],
      location: '',
      state: '',
      bio: '',
      createdAt: null,
      updatedAt: null,
    };
  }
  return {
    userId: row.user_id,
    skills: Array.isArray(row.skills) ? row.skills : [],
    interests: Array.isArray(row.interests) ? row.interests : [],
    availability: normalizeAvailabilityArray(row.availability),
    location: row.location || '',
    state: row.state || '',
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
    status: event.status,
    signupCount,
    availableSlots,
    isFull: availableSlots <= 0,
    isRegistered: Boolean(event.is_registered),
  };
}

function mapSignupRow(row) {
  const signupCount = Number(row.signup_count || 0);
  const hasAvailable = row.available_slots !== undefined && row.available_slots !== null;
  const availableSlots = hasAvailable ? Number(row.available_slots) : Math.max(row.capacity - signupCount, 0);
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
      signupCount,
      availableSlots,
    },
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

async function updateProfile({ userId, skills, interests, availability, location, state, bio }) {
  const normalizedSkills = normalizeStringArray(skills);
  const normalizedInterests = normalizeStringArray(interests);
  const normalizedAvailability = normalizeAvailabilityArray(availability);
  const normalizedLocation = normalizeCity(location);
  const normalizedState = normalizeState(state);
  const sanitizedBio = sanitizeText(bio);

  await ensureDefaultProfileOptions();
  await Promise.all([
    insertProfileOptions(PROFILE_OPTION_TYPES.SKILL, normalizedSkills),
    insertProfileOptions(PROFILE_OPTION_TYPES.INTEREST, normalizedInterests),
    insertProfileOptions(
      PROFILE_OPTION_TYPES.CITY,
      normalizedLocation ? normalizeCityValues([normalizedLocation]) : []
    ),
  ]);

  const updated = await upsertVolunteerProfile({
    userId,
    skills: normalizedSkills,
    interests: normalizedInterests,
    availability: normalizedAvailability,
    location: normalizedLocation,
    state: normalizedState,
    bio: sanitizedBio,
  });

  logger.info('Volunteer profile updated', {
    userId,
    skillsCount: normalizedSkills.length,
    interestsCount: normalizedInterests.length,
    availabilityCount: normalizedAvailability.length,
  });

  return mapProfileRow(updated, userId);
}

async function browseEvents(filters = {}, { userId = null } = {}) {
  const events = await listPublishedEvents(filters, { forUserId: userId });
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

  let emailDispatched = false;
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
  logger.info('Volunteer signed up for event', {
    userId: user.id,
    eventId,
    emailDispatched,
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
  const [profile, upcoming, past, hours, profileCatalogs] = await Promise.all([
    getProfile(userId),
    getUpcomingEventsForUser(userId),
    getPastEventsForUser(userId),
    getVolunteerHours(userId),
    getProfileCatalogs(),
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
    profileCatalogs,
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
  getProfileCatalogs,
  updateProfile,
  browseEvents,
  signupForEvent,
  listMySignups,
  recordVolunteerHours,
  getVolunteerHours,
  getVolunteerDashboard,
  dispatchEventReminders,
  startReminderScheduler,
};
