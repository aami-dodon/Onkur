const { randomUUID } = require('crypto');
const pool = require('../common/db');

function toNameSlug(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function ensureConstraint(constraintName, tableName, definitionSql) {
  const existing = await pool.query(
    `SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = $1 AND table_name = $2`,
    [constraintName, tableName]
  );
  if (!existing.rowCount) {
    await pool.query(definitionSql);
  }
}

const schemaPromise = (async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS volunteer_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      interests TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      availability TEXT NULL,
      state_code TEXT NULL,
      city_slug TEXT NULL,
      location TEXT NULL,
      bio TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE volunteer_profiles ADD COLUMN IF NOT EXISTS state_code TEXT NULL`);
  await pool.query(`ALTER TABLE volunteer_profiles ADD COLUMN IF NOT EXISTS city_slug TEXT NULL`);
  await pool.query(`ALTER TABLE volunteer_profiles ADD COLUMN IF NOT EXISTS location TEXT NULL`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile_skill_options (
      value TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile_interest_options (
      value TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profile_availability_options (
      value TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS indian_states (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS indian_cities (
      slug TEXT PRIMARY KEY,
      state_code TEXT NOT NULL REFERENCES indian_states(code) ON DELETE CASCADE,
      name TEXT NOT NULL,
      name_slug TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(state_code, name_slug)
    )
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_indian_cities_state ON indian_cities (state_code)`
  );
  await pool.query(
    `ALTER TABLE indian_cities DROP CONSTRAINT IF EXISTS indian_cities_state_code_lower_name_key`
  );
  await pool.query(`ALTER TABLE indian_cities ADD COLUMN IF NOT EXISTS name_slug TEXT`);
  const citiesNeedingSlug = await pool.query(
    `SELECT slug, name FROM indian_cities WHERE name_slug IS NULL OR name_slug = ''`
  );
  for (const city of citiesNeedingSlug.rows) {
    await pool.query(`UPDATE indian_cities SET name_slug = $1 WHERE slug = $2`, [
      toNameSlug(city.name || city.slug),
      city.slug,
    ]);
  }
  await pool.query(`ALTER TABLE indian_cities ALTER COLUMN name_slug SET NOT NULL`);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_indian_cities_state_name_slug ON indian_cities (state_code, name_slug)`
  );

  await pool.query(
    `ALTER TABLE volunteer_profiles DROP CONSTRAINT IF EXISTS volunteer_profiles_city_slug_fkey`
  );
  await pool.query(
    `ALTER TABLE volunteer_profiles DROP CONSTRAINT IF EXISTS volunteer_profiles_state_code_fkey`
  );
  await pool.query(
    `ALTER TABLE volunteer_profiles ADD CONSTRAINT volunteer_profiles_state_code_fkey FOREIGN KEY (state_code) REFERENCES indian_states(code) ON DELETE SET NULL`
  );
  await pool.query(
    `ALTER TABLE volunteer_profiles ADD CONSTRAINT volunteer_profiles_city_slug_fkey FOREIGN KEY (city_slug) REFERENCES indian_cities(slug) ON DELETE SET NULL`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_categories (
      value TEXT PRIMARY KEY,
      label TEXT NOT NULL,
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
      requirements TEXT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      approval_status TEXT NOT NULL DEFAULT 'PENDING',
      approval_note TEXT NULL,
      approval_decided_at TIMESTAMPTZ NULL,
      approval_decided_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      published_at TIMESTAMPTZ NULL,
      completed_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS requirements TEXT NULL`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL`);
  await pool.query(`ALTER TABLE events ALTER COLUMN location DROP NOT NULL`);
  await pool.query(`ALTER TABLE events ALTER COLUMN status SET DEFAULT 'DRAFT'`);
  await pool.query(
    `UPDATE events SET status = UPPER(status) WHERE status IS NOT NULL AND status <> UPPER(status)`
  );
  await pool.query(`ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check`);
  await pool.query(
    `ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status = ANY(ARRAY['DRAFT','PUBLISHED','CANCELLED','COMPLETED']::TEXT[]))`
  );

  await pool.query(
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'PENDING'`
  );
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS approval_note TEXT NULL`);
  await pool.query(
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ NULL`
  );
  await pool.query(
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS approval_decided_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`
  );
  await pool.query(`
    ALTER TABLE events
    DROP CONSTRAINT IF EXISTS events_approval_status_check
  `);
  await pool.query(`
    ALTER TABLE events
    ADD CONSTRAINT events_approval_status_check
    CHECK (approval_status = ANY(ARRAY['PENDING','APPROVED','REJECTED']::TEXT[]))
  `);

  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS category_value TEXT NULL`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS location_state_code TEXT NULL`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS location_city_slug TEXT NULL`);
  await pool.query(
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT FALSE`
  );
  await pool.query(
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS required_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`
  );
  await pool.query(
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS required_interests TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`
  );
  await pool.query(
    `ALTER TABLE events ADD COLUMN IF NOT EXISTS required_availability TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`
  );
  await ensureConstraint(
    'events_category_value_fkey',
    'events',
    `ALTER TABLE events ADD CONSTRAINT events_category_value_fkey FOREIGN KEY (category_value) REFERENCES event_categories(value) ON DELETE SET NULL`
  );
  await ensureConstraint(
    'events_state_code_fkey',
    'events',
    `ALTER TABLE events ADD CONSTRAINT events_state_code_fkey FOREIGN KEY (location_state_code) REFERENCES indian_states(code) ON DELETE SET NULL`
  );
  await ensureConstraint(
    'events_city_slug_fkey',
    'events',
    `ALTER TABLE events ADD CONSTRAINT events_city_slug_fkey FOREIGN KEY (location_city_slug) REFERENCES indian_cities(slug) ON DELETE SET NULL`
  );

  const existingCategories = await pool.query(
    `SELECT DISTINCT category FROM events WHERE category IS NOT NULL AND category <> ''`
  );
  for (const row of existingCategories.rows) {
    const categoryLabel = row.category;
    const value = toNameSlug(categoryLabel);
    if (!value) {
      continue;
    }
    await pool.query(
      `
        INSERT INTO event_categories (value, label, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (value)
        DO UPDATE SET label = EXCLUDED.label, updated_at = NOW()
      `,
      [value, categoryLabel]
    );
    await pool.query(
      `UPDATE events SET category_value = $1 WHERE category = $2 AND (category_value IS NULL OR category_value = '')`,
      [value, categoryLabel]
    );
  }

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
    CREATE TABLE IF NOT EXISTS event_tasks (
      id UUID PRIMARY KEY,
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NULL,
      required_count INTEGER NOT NULL DEFAULT 1 CHECK (required_count > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_assignments (
      id UUID PRIMARY KEY,
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      task_id UUID NOT NULL REFERENCES event_tasks(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status = ANY(ARRAY['ASSIGNED','COMPLETED']::TEXT[])),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(event_id, task_id, user_id)
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
    CREATE TABLE IF NOT EXISTS event_attendance (
      id UUID PRIMARY KEY,
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      check_in_at TIMESTAMPTZ NULL,
      check_out_at TIMESTAMPTZ NULL,
      minutes INTEGER NULL CHECK (minutes IS NULL OR minutes >= 0),
      hours_entry_id UUID NULL REFERENCES volunteer_hours(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_reports (
      event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
      total_signups INTEGER NOT NULL DEFAULT 0,
      total_checked_in INTEGER NOT NULL DEFAULT 0,
      total_hours INTEGER NOT NULL DEFAULT 0,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_event_tasks_event ON event_tasks (event_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_event_assignments_event_user ON event_assignments (event_id, user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_event_attendance_event_user ON event_attendance (event_id, user_id)
  `);
})();

async function ensureSchema() {
  await schemaPromise;
}

async function getVolunteerProfile(userId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        vp.user_id,
        vp.skills,
        vp.interests,
        vp.availability,
        vp.state_code,
        vp.city_slug,
        vp.location,
        vp.bio,
        vp.created_at,
        vp.updated_at,
        ao.label AS availability_label,
        s.name AS state_name,
        c.name AS city_name
      FROM volunteer_profiles vp
      LEFT JOIN profile_availability_options ao ON ao.value = vp.availability
      LEFT JOIN indian_states s ON s.code = vp.state_code
      LEFT JOIN indian_cities c ON c.slug = vp.city_slug
      WHERE vp.user_id = $1
    `,
    [userId]
  );
  return result.rows[0] || null;
}

async function upsertVolunteerProfile({
  userId,
  skills,
  interests,
  availability,
  stateCode,
  citySlug,
  location,
  bio,
}) {
  await ensureSchema();
  const result = await pool.query(
    `
      INSERT INTO volunteer_profiles (user_id, skills, interests, availability, state_code, city_slug, location, bio, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        skills = EXCLUDED.skills,
        interests = EXCLUDED.interests,
        availability = EXCLUDED.availability,
        state_code = EXCLUDED.state_code,
        city_slug = EXCLUDED.city_slug,
        location = EXCLUDED.location,
        bio = EXCLUDED.bio,
        updated_at = NOW()
      RETURNING user_id, skills, interests, availability, state_code, city_slug, location, bio, created_at, updated_at
    `,
    [userId, skills, interests, availability, stateCode, citySlug, location, bio]
  );
  return result.rows[0];
}

async function ensureSkillOption({ value, label }) {
  await ensureSchema();
  if (!value) {
    return null;
  }
  const result = await pool.query(
    `
      INSERT INTO profile_skill_options (value, label, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (value)
      DO UPDATE SET label = EXCLUDED.label, updated_at = NOW()
      RETURNING value, label
    `,
    [value, label || value]
  );
  return result.rows[0];
}

async function ensureInterestOption({ value, label }) {
  await ensureSchema();
  if (!value) {
    return null;
  }
  const result = await pool.query(
    `
      INSERT INTO profile_interest_options (value, label, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (value)
      DO UPDATE SET label = EXCLUDED.label, updated_at = NOW()
      RETURNING value, label
    `,
    [value, label || value]
  );
  return result.rows[0];
}

async function ensureAvailabilityOption({ value, label, sortOrder = 0 }) {
  await ensureSchema();
  if (!value) {
    return null;
  }
  const result = await pool.query(
    `
      INSERT INTO profile_availability_options (value, label, sort_order)
      VALUES ($1, $2, $3)
      ON CONFLICT (value)
      DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order
      RETURNING value, label, sort_order
    `,
    [value, label || value, sortOrder]
  );
  return result.rows[0];
}

async function ensureState({ code, name }) {
  await ensureSchema();
  if (!code) {
    return null;
  }
  const result = await pool.query(
    `
      INSERT INTO indian_states (code, name, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (code)
      DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
      RETURNING code, name
    `,
    [code, name || code]
  );
  return result.rows[0];
}

async function ensureCity({ slug, stateCode, name }) {
  await ensureSchema();
  if (!slug || !stateCode) {
    return null;
  }
  const nameSlug = toNameSlug(name || slug);
  const result = await pool.query(
    `
      INSERT INTO indian_cities (slug, state_code, name, name_slug, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (slug)
      DO UPDATE SET state_code = EXCLUDED.state_code, name = EXCLUDED.name, name_slug = EXCLUDED.name_slug, updated_at = NOW()
      RETURNING slug, state_code, name
    `,
    [slug, stateCode, name || slug, nameSlug]
  );
  return result.rows[0];
}

async function listSkillOptions() {
  await ensureSchema();
  const result = await pool.query(
    `SELECT value, label FROM profile_skill_options ORDER BY label ASC`
  );
  return result.rows;
}

async function listInterestOptions() {
  await ensureSchema();
  const result = await pool.query(
    `SELECT value, label FROM profile_interest_options ORDER BY label ASC`
  );
  return result.rows;
}

async function listAvailabilityOptions() {
  await ensureSchema();
  const result = await pool.query(
    `SELECT value, label, sort_order FROM profile_availability_options ORDER BY sort_order ASC, label ASC`
  );
  return result.rows;
}

async function listStates() {
  await ensureSchema();
  const result = await pool.query(`SELECT code, name FROM indian_states ORDER BY name ASC`);
  return result.rows;
}

async function listCitiesByState(stateCode) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT slug, state_code, name FROM indian_cities WHERE state_code = $1 ORDER BY name ASC`,
    [stateCode]
  );
  return result.rows;
}

async function findAvailabilityOption(value) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT value, label FROM profile_availability_options WHERE value = $1`,
    [value]
  );
  return result.rows[0] || null;
}

async function findStateByCode(code) {
  await ensureSchema();
  const result = await pool.query(`SELECT code, name FROM indian_states WHERE code = $1`, [code]);
  return result.rows[0] || null;
}

async function findCityBySlug(slug) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT slug, state_code, name FROM indian_cities WHERE slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
}

async function listPublishedEvents({ category, location, theme, date }, { forUserId = null } = {}) {
  await ensureSchema();
  const conditions = ["e.status = 'PUBLISHED'"];
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
    const signupRes = await pool.query(`SELECT event_id FROM event_signups WHERE user_id = $1`, [
      forUserId,
    ]);
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
        SELECT id, title, date_start, date_end, location, capacity, status, created_by
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

    if (event.status !== 'PUBLISHED') {
      throw Object.assign(new Error('Event is not open for registration'), { statusCode: 400 });
    }

    const existing = await client.query(
      `SELECT id FROM event_signups WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );
    if (existing.rows[0]) {
      throw Object.assign(new Error('You are already registered for this event'), {
        statusCode: 409,
      });
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

async function cancelEventSignup({ eventId, userId }) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const eventResult = await client.query(
      `
        SELECT
          e.id,
          e.title,
          e.date_start,
          e.date_end,
          e.location,
          e.capacity,
          e.status,
          e.created_by,
          mgr.name AS manager_name,
          mgr.email AS manager_email
        FROM events e
        LEFT JOIN users mgr ON mgr.id = e.created_by
        WHERE e.id = $1
        FOR UPDATE
      `,
      [eventId]
    );

    const event = eventResult.rows[0];
    if (!event) {
      throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }

    const signupResult = await client.query(
      `
        SELECT id, created_at
        FROM event_signups
        WHERE event_id = $1 AND user_id = $2
        FOR UPDATE
      `,
      [eventId, userId]
    );

    const signup = signupResult.rows[0];
    if (!signup) {
      throw Object.assign(new Error('You are not registered for this event'), { statusCode: 404 });
    }

    await client.query(`DELETE FROM event_assignments WHERE event_id = $1 AND user_id = $2`, [
      eventId,
      userId,
    ]);

    const removedHours = await client.query(
      `
        DELETE FROM volunteer_hours
        WHERE event_id = $1 AND user_id = $2
        RETURNING id, minutes
      `,
      [eventId, userId]
    );

    await client.query(`DELETE FROM event_attendance WHERE event_id = $1 AND user_id = $2`, [
      eventId,
      userId,
    ]);

    await client.query(`DELETE FROM event_signups WHERE event_id = $1 AND user_id = $2`, [
      eventId,
      userId,
    ]);

    await client.query('COMMIT');

    const managerContact = event.created_by
      ? {
          id: event.created_by,
          name: event.manager_name || null,
          email: event.manager_email || null,
        }
      : null;

    const totalMinutesRemoved = removedHours.rows.reduce(
      (total, row) => total + Number(row.minutes || 0),
      0
    );

    return {
      event,
      signup,
      manager: managerContact,
      removedMinutes: totalMinutesRemoved,
    };
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
        e.requirements,
        COALESCE(sc.signup_count, 0) AS signup_count,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'assignmentId', ea.id,
                'taskId', ea.task_id,
                'taskTitle', et.title,
                'taskDescription', et.description,
                'status', ea.status,
                'createdAt', ea.created_at,
                'updatedAt', ea.updated_at
              )
              ORDER BY et.title
            ),
            '[]'::json
          )
          FROM event_assignments ea
          JOIN event_tasks et ON et.id = ea.task_id
          WHERE ea.event_id = es.event_id AND ea.user_id = es.user_id
        ) AS assignments,
        (
          SELECT row_to_json(att)
          FROM (
            SELECT
              id,
              check_in_at,
              check_out_at,
              minutes,
              hours_entry_id,
              created_at,
              updated_at
            FROM event_attendance
            WHERE event_id = es.event_id AND user_id = es.user_id
          ) att
        ) AS attendance
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
      AND e.status = 'PUBLISHED'
      AND e.date_start > NOW()
      AND e.date_start <= NOW() + INTERVAL '24 hours'
      AND e.date_start - INTERVAL '24 hours' <= NOW()
  `);
  return result.rows;
}

async function markReminderSent(signupId) {
  await ensureSchema();
  await pool.query(`UPDATE event_signups SET reminder_sent_at = NOW() WHERE id = $1`, [signupId]);
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
  ensureSkillOption,
  ensureInterestOption,
  ensureAvailabilityOption,
  ensureState,
  ensureCity,
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
};
