const { randomUUID } = require('crypto');
const pool = require('../common/db');

const schemaPromise = (async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS volunteer_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      interests TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      availability TEXT NULL,
      location TEXT NULL,
      bio TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      theme TEXT NULL,
      date_start TIMESTAMPTZ NOT NULL,
      date_end TIMESTAMPTZ NOT NULL,
      location TEXT NOT NULL,
      capacity INTEGER NOT NULL CHECK (capacity > 0),
      status TEXT NOT NULL CHECK (status = ANY(ARRAY['draft','published','cancelled']::TEXT[])),
      created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_signups (
      id UUID PRIMARY KEY,
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reminder_sent_at TIMESTAMPTZ NULL,
      UNIQUE(event_id, user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS volunteer_hours (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_id UUID NULL REFERENCES events(id) ON DELETE SET NULL,
      minutes INTEGER NOT NULL CHECK (minutes > 0),
      note TEXT NULL,
      verified_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_events_status_date ON events (status, date_start)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_event_signups_event ON event_signups (event_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_event_signups_user ON event_signups (user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_volunteer_hours_user ON volunteer_hours (user_id)
  `);
})();

async function ensureSchema() {
  await schemaPromise;
}

async function getVolunteerProfile(userId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT user_id, skills, interests, availability, location, bio, created_at, updated_at
      FROM volunteer_profiles
      WHERE user_id = $1
    `,
    [userId]
  );
  return result.rows[0] || null;
}

async function upsertVolunteerProfile({ userId, skills, interests, availability, location, bio }) {
  await ensureSchema();
  const result = await pool.query(
    `
      INSERT INTO volunteer_profiles (user_id, skills, interests, availability, location, bio, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        skills = EXCLUDED.skills,
        interests = EXCLUDED.interests,
        availability = EXCLUDED.availability,
        location = EXCLUDED.location,
        bio = EXCLUDED.bio,
        updated_at = NOW()
      RETURNING user_id, skills, interests, availability, location, bio, created_at, updated_at
    `,
    [userId, skills, interests, availability, location, bio]
  );
  return result.rows[0];
}

async function listPublishedEvents({ category, location, theme, date }, { forUserId = null } = {}) {
  await ensureSchema();
  const conditions = ["e.status = 'published'"];
  const values = [];

  if (category) {
    values.push(category);
    conditions.push(`LOWER(e.category) = LOWER($${values.length})`);
  }

  if (location) {
    values.push(`%${location.toLowerCase()}%`);
    conditions.push(`LOWER(e.location) LIKE $${values.length}`);
  }

  if (theme) {
    values.push(theme);
    conditions.push(`LOWER(e.theme) = LOWER($${values.length})`);
  }

  if (date) {
    values.push(date);
    const index = values.length;
    conditions.push(`DATE(e.date_start) <= $${index}`);
    conditions.push(`DATE(e.date_end) >= $${index}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      e.id,
      e.title,
      e.description,
      e.category,
      e.theme,
      e.date_start,
      e.date_end,
      e.location,
      e.capacity,
      e.status,
      e.created_at,
      e.updated_at,
      COALESCE(sc.signup_count, 0) AS signup_count
    FROM events e
    LEFT JOIN (
      SELECT event_id, COUNT(*)::INT AS signup_count
      FROM event_signups
      GROUP BY event_id
    ) sc ON sc.event_id = e.id
    ${whereClause}
    ORDER BY e.date_start ASC
  `;

  const result = await pool.query(query, values);
  const events = result.rows;

  let registeredIds = new Set();
  if (forUserId) {
    const signupRes = await pool.query(
      `SELECT event_id FROM event_signups WHERE user_id = $1`,
      [forUserId]
    );
    registeredIds = new Set(signupRes.rows.map((row) => row.event_id));
  }

  return events.map((event) => ({
    ...event,
    signup_count: Number(event.signup_count || 0),
    available_slots: Math.max(event.capacity - Number(event.signup_count || 0), 0),
    is_registered: registeredIds.has(event.id),
  }));
}

async function findEventById(eventId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        e.id,
        e.title,
        e.description,
        e.category,
        e.theme,
        e.date_start,
        e.date_end,
        e.location,
        e.capacity,
        e.status,
        e.created_at,
        e.updated_at,
        COALESCE(sc.signup_count, 0) AS signup_count
      FROM events e
      LEFT JOIN (
        SELECT event_id, COUNT(*)::INT AS signup_count
        FROM event_signups
        GROUP BY event_id
      ) sc ON sc.event_id = e.id
      WHERE e.id = $1
    `,
    [eventId]
  );
  if (!result.rows[0]) {
    return null;
  }
  const row = result.rows[0];
  return {
    ...row,
    signup_count: Number(row.signup_count || 0),
    available_slots: Math.max(row.capacity - Number(row.signup_count || 0), 0),
  };
}

async function createEventSignup({ eventId, userId }) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const eventResult = await client.query(
      `
        SELECT id, title, date_start, date_end, location, capacity, status
        FROM events
        WHERE id = $1
        FOR UPDATE
      `,
      [eventId]
    );

    const event = eventResult.rows[0];
    if (!event) {
      throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }

    if (event.status !== 'published') {
      throw Object.assign(new Error('Event is not open for registration'), { statusCode: 400 });
    }

    const existing = await client.query(
      `SELECT id FROM event_signups WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );
    if (existing.rows[0]) {
      throw Object.assign(new Error('You are already registered for this event'), { statusCode: 409 });
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::INT AS count FROM event_signups WHERE event_id = $1`,
      [eventId]
    );
    const currentCount = Number(countResult.rows[0]?.count || 0);
    if (currentCount >= event.capacity) {
      throw Object.assign(new Error('Event capacity has been reached'), { statusCode: 409 });
    }

    const signupId = randomUUID();
    const signupResult = await client.query(
      `
        INSERT INTO event_signups (id, event_id, user_id)
        VALUES ($1, $2, $3)
        RETURNING id, event_id, user_id, status, created_at
      `,
      [signupId, eventId, userId]
    );

    await client.query('COMMIT');
    return { event, signup: signupResult.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function hasSignup({ userId, eventId }) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT 1 FROM event_signups WHERE user_id = $1 AND event_id = $2`,
    [userId, eventId]
  );
  return Boolean(result.rowCount);
}

async function listSignupsForUser(userId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        es.id,
        es.status,
        es.created_at,
        es.event_id,
        es.reminder_sent_at,
        e.title,
        e.description,
        e.category,
        e.theme,
        e.date_start,
        e.date_end,
        e.location,
        e.capacity,
        COALESCE(sc.signup_count, 0) AS signup_count
      FROM event_signups es
      JOIN events e ON e.id = es.event_id
      LEFT JOIN (
        SELECT event_id, COUNT(*)::INT AS signup_count
        FROM event_signups
        GROUP BY event_id
      ) sc ON sc.event_id = e.id
      WHERE es.user_id = $1
      ORDER BY e.date_start ASC
    `,
    [userId]
  );

  return result.rows.map((row) => ({
    ...row,
    signup_count: Number(row.signup_count || 0),
    available_slots: Math.max(row.capacity - Number(row.signup_count || 0), 0),
  }));
}

async function logVolunteerHours({ userId, eventId, minutes, note, verifiedBy = null }) {
  await ensureSchema();
  const id = randomUUID();
  const result = await pool.query(
    `
      INSERT INTO volunteer_hours (id, user_id, event_id, minutes, note, verified_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, event_id, minutes, note, verified_by, created_at
    `,
    [id, userId, eventId, minutes, note || null, verifiedBy]
  );
  return result.rows[0];
}

async function listVolunteerHours(userId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        vh.id,
        vh.user_id,
        vh.event_id,
        vh.minutes,
        vh.note,
        vh.verified_by,
        vh.created_at,
        e.title AS event_title,
        e.date_start AS event_date_start,
        e.date_end AS event_date_end
      FROM volunteer_hours vh
      LEFT JOIN events e ON e.id = vh.event_id
      WHERE vh.user_id = $1
      ORDER BY vh.created_at DESC
    `,
    [userId]
  );
  return result.rows;
}

async function getTotalMinutesForUser(userId) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT COALESCE(SUM(minutes), 0)::INT AS total_minutes FROM volunteer_hours WHERE user_id = $1`,
    [userId]
  );
  return Number(result.rows[0]?.total_minutes || 0);
}

async function findSignupsNeedingReminder() {
  await ensureSchema();
  const result = await pool.query(`
    SELECT
      es.id,
      es.user_id,
      es.event_id,
      es.reminder_sent_at,
      u.email,
      u.name,
      e.title,
      e.date_start,
      e.date_end,
      e.location
    FROM event_signups es
    JOIN events e ON e.id = es.event_id
    JOIN users u ON u.id = es.user_id
    WHERE es.reminder_sent_at IS NULL
      AND e.status = 'published'
      AND e.date_start > NOW()
      AND e.date_start <= NOW() + INTERVAL '24 hours'
      AND e.date_start - INTERVAL '24 hours' <= NOW()
  `);
  return result.rows;
}

async function markReminderSent(signupId) {
  await ensureSchema();
  await pool.query(
    `UPDATE event_signups SET reminder_sent_at = NOW() WHERE id = $1`,
    [signupId]
  );
}

async function getUpcomingEventsForUser(userId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        e.id,
        e.title,
        e.date_start,
        e.date_end,
        e.location,
        e.theme,
        e.category,
        es.created_at AS signup_created_at
      FROM event_signups es
      JOIN events e ON e.id = es.event_id
      WHERE es.user_id = $1
        AND e.date_end >= NOW()
      ORDER BY e.date_start ASC
      LIMIT 10
    `,
    [userId]
  );
  return result.rows;
}

async function getPastEventsForUser(userId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        e.id,
        e.title,
        e.date_start,
        e.date_end,
        e.location,
        e.theme,
        e.category,
        es.created_at AS signup_created_at
      FROM event_signups es
      JOIN events e ON e.id = es.event_id
      WHERE es.user_id = $1
        AND e.date_end < NOW()
      ORDER BY e.date_end DESC
      LIMIT 10
    `,
    [userId]
  );
  return result.rows;
}

module.exports = {
  ensureSchema,
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
};
