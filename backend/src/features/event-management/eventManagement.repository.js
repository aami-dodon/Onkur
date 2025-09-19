const { randomUUID } = require('crypto');
const pool = require('../common/db');
const { ensureSchema } = require('../volunteer-journey/volunteerJourney.repository');

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function mapEventRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    categoryValue: row.category_value || null,
    categoryLabel: row.category_label || row.category || null,
    theme: row.theme,
    dateStart: toIso(row.date_start),
    dateEnd: toIso(row.date_end),
    location: row.location,
    locationNote: row.location,
    stateCode: row.location_state_code || null,
    stateName: row.state_name || null,
    citySlug: row.location_city_slug || null,
    cityName: row.city_name || null,
    isOnline: Boolean(row.is_online),
    capacity: row.capacity,
    requirements: row.requirements || '',
    requiredSkills: Array.isArray(row.required_skills) ? row.required_skills : [],
    requiredInterests: Array.isArray(row.required_interests) ? row.required_interests : [],
    requiredAvailability: Array.isArray(row.required_availability) ? row.required_availability : [],
    status: row.status,
    approvalStatus: row.approval_status || 'PENDING',
    approvalNote: row.approval_note || null,
    approvalDecidedAt: toIso(row.approval_decided_at),
    approvalDecidedBy: row.approval_decided_by || null,
    createdBy: row.created_by || null,
    createdByName: row.creator_name || row.created_by_name || null,
    createdByEmail: row.creator_email || row.created_by_email || null,
    publishedAt: toIso(row.published_at),
    completedAt: toIso(row.completed_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    signupCount: Number(row.signup_count || 0),
    checkedInCount: Number(row.checked_in_count || 0),
    totalMinutes: Number(row.total_minutes || 0),
  };
}

async function withTransaction(handler) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createEvent({
  title,
  description,
  category,
  categoryValue = null,
  theme = null,
  dateStart,
  dateEnd,
  location,
  stateCode = null,
  citySlug = null,
  isOnline = false,
  capacity,
  requirements = null,
  requiredSkills = [],
  requiredInterests = [],
  requiredAvailability = [],
  createdBy = null,
}) {
  await ensureSchema();
  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO events (
        id,
        title,
        description,
        category,
        category_value,
        theme,
        date_start,
        date_end,
        location,
        location_state_code,
        location_city_slug,
        is_online,
        capacity,
        requirements,
        required_skills,
        required_interests,
        required_availability,
        status,
        created_by
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        'DRAFT',
        $18
      )
      RETURNING *
    `,
    [
      id,
      title,
      description,
      category,
      categoryValue,
      theme,
      dateStart,
      dateEnd,
      location,
      stateCode,
      citySlug,
      isOnline,
      capacity,
      requirements,
      requiredSkills,
      requiredInterests,
      requiredAvailability,
      createdBy,
    ]
  );
  return findEventById(id);
}

async function updateEvent(eventId, updates = {}) {
  await ensureSchema();
  const fields = [];
  const values = [];
  const allowed = new Map([
    ['title', 'title'],
    ['description', 'description'],
    ['category', 'category'],
    ['categoryValue', 'category_value'],
    ['theme', 'theme'],
    ['dateStart', 'date_start'],
    ['dateEnd', 'date_end'],
    ['location', 'location'],
    ['stateCode', 'location_state_code'],
    ['citySlug', 'location_city_slug'],
    ['isOnline', 'is_online'],
    ['capacity', 'capacity'],
    ['requirements', 'requirements'],
    ['requiredSkills', 'required_skills'],
    ['requiredInterests', 'required_interests'],
    ['requiredAvailability', 'required_availability'],
  ]);

  for (const [key, column] of allowed.entries()) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      fields.push(`${column} = $${fields.length + 1}`);
      values.push(updates[key]);
    }
  }

  if (!fields.length) {
    const existing = await findEventById(eventId);
    if (!existing) {
      throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }
    return existing;
  }

  values.push(eventId);
  await pool.query(
    `
      UPDATE events
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
    `,
    values
  );
  const fresh = await findEventById(eventId);
  if (!fresh) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }
  return fresh;
}

async function setEventStatus(eventId, status) {
  const allowedStatuses = new Set(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']);
  if (!allowedStatuses.has(status)) {
    throw Object.assign(new Error('Unsupported event status'), { statusCode: 400 });
  }

  return withTransaction(async (client) => {
    await ensureSchema();
    const current = await client.query('SELECT status FROM events WHERE id = $1 FOR UPDATE', [
      eventId,
    ]);
    if (!current.rows[0]) {
      throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }

    const result = await client.query(
      `
        UPDATE events
        SET status = $2,
            published_at = CASE WHEN $2 = 'PUBLISHED' THEN NOW() ELSE published_at END,
            completed_at = CASE WHEN $2 = 'COMPLETED' THEN NOW() ELSE completed_at END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [eventId, status]
    );

    return mapEventRow(result.rows[0]);
  });
}

function normalizeApprovalStatus(status) {
  if (!status) {
    return null;
  }
  const value = String(status).trim().toUpperCase();
  if (value === 'PENDING' || value === 'APPROVED' || value === 'REJECTED') {
    return value;
  }
  return null;
}

async function listEventsPendingApproval() {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        e.*, 
        cat.label AS category_label,
        s.name AS state_name,
        c.name AS city_name,
        COALESCE(signups.count, 0) AS signup_count,
        COALESCE(att.checked_in, 0) AS checked_in_count,
        COALESCE(hours.total_minutes, 0) AS total_minutes,
        creator.name AS creator_name,
        creator.email AS creator_email
      FROM events e
      LEFT JOIN event_categories cat ON cat.value = e.category_value
      LEFT JOIN indian_states s ON s.code = e.location_state_code
      LEFT JOIN indian_cities c ON c.slug = e.location_city_slug
      LEFT JOIN users creator ON creator.id = e.created_by
      LEFT JOIN (
        SELECT event_id, COUNT(*)::INT AS count
        FROM event_signups
        GROUP BY event_id
      ) signups ON signups.event_id = e.id
      LEFT JOIN (
        SELECT event_id, COUNT(*)::INT AS checked_in
        FROM event_attendance
        WHERE check_in_at IS NOT NULL
        GROUP BY event_id
      ) att ON att.event_id = e.id
      LEFT JOIN (
        SELECT event_id, SUM(minutes)::INT AS total_minutes
        FROM volunteer_hours
        GROUP BY event_id
      ) hours ON hours.event_id = e.id
      WHERE e.approval_status = 'PENDING'
      ORDER BY e.created_at ASC
    `
  );
  return result.rows.map((row) =>
    mapEventRow({
      ...row,
      creator_name: row.creator_name || (row.created_by_name ?? null),
      creator_email: row.creator_email || (row.created_by_email ?? null),
    })
  );
}

async function setEventApprovalStatus(eventId, { status, note = null, moderatorId = null }) {
  const normalizedStatus = normalizeApprovalStatus(status);
  if (!normalizedStatus) {
    throw Object.assign(new Error('Unsupported approval status'), { statusCode: 400 });
  }

  return withTransaction(async (client) => {
    await ensureSchema();
    const current = await client.query('SELECT * FROM events WHERE id = $1 FOR UPDATE', [eventId]);
    const existing = current.rows[0];
    if (!existing) {
      throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }

    const moderationNote = note ? String(note).trim() : null;
    const shouldReset = normalizedStatus === 'REJECTED';

    const updateResult = await client.query(
      `
        UPDATE events
        SET approval_status = $2,
            approval_note = $3,
            approval_decided_at = CASE WHEN $2 <> 'PENDING' THEN NOW() ELSE NULL END,
            approval_decided_by = CASE WHEN $2 <> 'PENDING' THEN $4 ELSE NULL END,
            status = CASE
              WHEN $2 = 'APPROVED' THEN 'PUBLISHED'
              WHEN $2 = 'REJECTED' THEN 'DRAFT'
              ELSE status
            END,
            published_at = CASE WHEN $2 = 'APPROVED' THEN COALESCE(published_at, NOW()) ELSE published_at END,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [eventId, normalizedStatus, moderationNote, moderatorId]
    );

    const updated = updateResult.rows[0];

    if (shouldReset && updated) {
      await client.query(
        `
          UPDATE events
          SET published_at = NULL
          WHERE id = $1
        `,
        [eventId]
      );
      updated.published_at = null;
    }

    return mapEventRow(updated);
  });
}

async function findEventById(eventId, { client = pool } = {}) {
  await ensureSchema();
  const result = await client.query(
    `
      SELECT
        e.*,
        cat.label AS category_label,
        s.name AS state_name,
        c.name AS city_name,
        COALESCE(signups.count, 0) AS signup_count,
        COALESCE(att.checked_in, 0) AS checked_in_count,
        COALESCE(hours.total_minutes, 0) AS total_minutes
      FROM events e
      LEFT JOIN event_categories cat ON cat.value = e.category_value
      LEFT JOIN indian_states s ON s.code = e.location_state_code
      LEFT JOIN indian_cities c ON c.slug = e.location_city_slug
      LEFT JOIN (
        SELECT event_id, COUNT(*)::INT AS count
        FROM event_signups
        GROUP BY event_id
      ) signups ON signups.event_id = e.id
      LEFT JOIN (
        SELECT event_id, COUNT(*)::INT AS checked_in
        FROM event_attendance
        WHERE check_in_at IS NOT NULL
        GROUP BY event_id
      ) att ON att.event_id = e.id
      LEFT JOIN (
        SELECT event_id, COALESCE(SUM(minutes), 0)::INT AS total_minutes
        FROM volunteer_hours
        GROUP BY event_id
      ) hours ON hours.event_id = e.id
      WHERE e.id = $1
    `,
    [eventId]
  );
  return mapEventRow(result.rows[0]);
}

async function listEventsForManager(managerId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        e.*,
        cat.label AS category_label,
        s.name AS state_name,
        c.name AS city_name,
        COALESCE(signups.count, 0) AS signup_count,
        COALESCE(att.checked_in, 0) AS checked_in_count,
        COALESCE(hours.total_minutes, 0) AS total_minutes
      FROM events e
      LEFT JOIN event_categories cat ON cat.value = e.category_value
      LEFT JOIN indian_states s ON s.code = e.location_state_code
      LEFT JOIN indian_cities c ON c.slug = e.location_city_slug
      LEFT JOIN (
        SELECT event_id, COUNT(*)::INT AS count
        FROM event_signups
        GROUP BY event_id
      ) signups ON signups.event_id = e.id
      LEFT JOIN (
        SELECT event_id, COUNT(*)::INT AS checked_in
        FROM event_attendance
        WHERE check_in_at IS NOT NULL
        GROUP BY event_id
      ) att ON att.event_id = e.id
      LEFT JOIN (
        SELECT event_id, COALESCE(SUM(minutes), 0)::INT AS total_minutes
        FROM volunteer_hours
        GROUP BY event_id
      ) hours ON hours.event_id = e.id
      WHERE e.created_by = $1
      ORDER BY e.date_start ASC
    `,
    [managerId]
  );
  return result.rows.map(mapEventRow);
}

async function listTasksForEvent(eventId, { client = pool } = {}) {
  const result = await client.query(
    `
      SELECT id, event_id, title, description, required_count, created_at, updated_at
      FROM event_tasks
      WHERE event_id = $1
      ORDER BY created_at ASC
    `,
    [eventId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    description: row.description || '',
    requiredCount: row.required_count,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }));
}

async function replaceEventTasks(eventId, tasks = []) {
  return withTransaction(async (client) => {
    await ensureSchema();
    const event = await findEventById(eventId, { client });
    if (!event) {
      throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }

    const existing = await client.query(`SELECT id FROM event_tasks WHERE event_id = $1`, [
      eventId,
    ]);
    const existingIds = new Set(existing.rows.map((row) => row.id));
    const keepIds = new Set();

    for (const task of tasks) {
      if (!task || !task.title) {
        throw Object.assign(new Error('Task title is required'), { statusCode: 400 });
      }
      const requiredCount = Number(task.requiredCount || task.required_count || 1);
      if (!Number.isFinite(requiredCount) || requiredCount <= 0) {
        throw Object.assign(new Error('Task required count must be greater than zero'), {
          statusCode: 400,
        });
      }

      if (task.id && existingIds.has(task.id)) {
        await client.query(
          `
            UPDATE event_tasks
            SET title = $1, description = $2, required_count = $3, updated_at = NOW()
            WHERE id = $4 AND event_id = $5
          `,
          [task.title, task.description || null, requiredCount, task.id, eventId]
        );
        keepIds.add(task.id);
      } else {
        const id = randomUUID();
        await client.query(
          `
            INSERT INTO event_tasks (id, event_id, title, description, required_count)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [id, eventId, task.title, task.description || null, requiredCount]
        );
        keepIds.add(id);
      }
    }

    if (existingIds.size) {
      const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
      if (toDelete.length) {
        await client.query(`DELETE FROM event_tasks WHERE event_id = $1 AND id = ANY($2::UUID[])`, [
          eventId,
          toDelete,
        ]);
      }
    }

    return listTasksForEvent(eventId, { client });
  });
}

async function listAssignmentsForEvent(eventId, { client = pool } = {}) {
  const result = await client.query(
    `
      SELECT
        ea.id,
        ea.event_id,
        ea.task_id,
        ea.user_id,
        ea.status,
        ea.created_at,
        ea.updated_at,
        et.title AS task_title,
        et.description AS task_description,
        et.required_count,
        u.name AS volunteer_name,
        u.email AS volunteer_email
      FROM event_assignments ea
      JOIN event_tasks et ON et.id = ea.task_id
      JOIN users u ON u.id = ea.user_id
      WHERE ea.event_id = $1
      ORDER BY et.title ASC, u.name ASC
    `,
    [eventId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    taskId: row.task_id,
    userId: row.user_id,
    status: row.status,
    taskTitle: row.task_title,
    taskDescription: row.task_description || '',
    requiredCount: row.required_count,
    volunteerName: row.volunteer_name,
    volunteerEmail: row.volunteer_email,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }));
}

async function assignVolunteers(eventId, assignments = []) {
  if (!assignments.length) {
    return { assignments: await listAssignmentsForEvent(eventId), newAssignments: [] };
  }

  return withTransaction(async (client) => {
    await ensureSchema();
    const event = await findEventById(eventId, { client });
    if (!event) {
      throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }

    const newAssignments = [];

    for (const assignment of assignments) {
      if (!assignment || !assignment.taskId || !assignment.userId) {
        throw Object.assign(new Error('Task and volunteer identifiers are required'), {
          statusCode: 400,
        });
      }

      const taskResult = await client.query(
        `SELECT id FROM event_tasks WHERE id = $1 AND event_id = $2`,
        [assignment.taskId, eventId]
      );
      if (!taskResult.rows[0]) {
        throw Object.assign(new Error('Task not found for this event'), { statusCode: 404 });
      }

      const signupResult = await client.query(
        `SELECT id FROM event_signups WHERE event_id = $1 AND user_id = $2`,
        [eventId, assignment.userId]
      );
      if (!signupResult.rows[0]) {
        throw Object.assign(
          new Error('Volunteer must be registered for the event before assignment'),
          {
            statusCode: 400,
          }
        );
      }

      const existing = await client.query(
        `
          SELECT id FROM event_assignments
          WHERE event_id = $1 AND task_id = $2 AND user_id = $3
        `,
        [eventId, assignment.taskId, assignment.userId]
      );

      if (existing.rows[0]) {
        await client.query(
          `
            UPDATE event_assignments
            SET status = $1, updated_at = NOW()
            WHERE id = $2
          `,
          [assignment.status || 'ASSIGNED', existing.rows[0].id]
        );
      } else {
        const id = randomUUID();
        const result = await client.query(
          `
            INSERT INTO event_assignments (id, event_id, task_id, user_id, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `,
          [id, eventId, assignment.taskId, assignment.userId, assignment.status || 'ASSIGNED']
        );
        newAssignments.push({
          assignmentId: result.rows[0].id,
          userId: assignment.userId,
          taskId: assignment.taskId,
        });
      }
    }

    const assignmentsWithDetails = await listAssignmentsForEvent(eventId, { client });
    return { assignments: assignmentsWithDetails, newAssignments };
  });
}

async function getAttendanceRecord(eventId, userId, { client = pool } = {}) {
  const result = await client.query(
    `
      SELECT id, event_id, user_id, check_in_at, check_out_at, minutes, hours_entry_id, created_at, updated_at
      FROM event_attendance
      WHERE event_id = $1 AND user_id = $2
    `,
    [eventId, userId]
  );
  return result.rows[0] || null;
}

async function recordAttendance(eventId, userId, { action, minutesOverride = null } = {}) {
  if (!['check-in', 'check-out'].includes(action)) {
    throw Object.assign(new Error('Action must be either check-in or check-out'), {
      statusCode: 400,
    });
  }

  return withTransaction(async (client) => {
    await ensureSchema();
    const event = await findEventById(eventId, { client });
    if (!event) {
      throw Object.assign(new Error('Event not found'), { statusCode: 404 });
    }

    const signupResult = await client.query(
      `SELECT id FROM event_signups WHERE event_id = $1 AND user_id = $2`,
      [eventId, userId]
    );
    if (!signupResult.rows[0]) {
      throw Object.assign(new Error('Volunteer is not registered for this event'), {
        statusCode: 400,
      });
    }

    let attendance = await getAttendanceRecord(eventId, userId, { client });

    if (!attendance) {
      const id = randomUUID();
      const insert = await client.query(
        `
          INSERT INTO event_attendance (id, event_id, user_id)
          VALUES ($1, $2, $3)
          RETURNING id, event_id, user_id, check_in_at, check_out_at, minutes, hours_entry_id, created_at, updated_at
        `,
        [id, eventId, userId]
      );
      attendance = insert.rows[0];
    }

    if (action === 'check-in') {
      if (attendance.check_in_at) {
        return {
          ...attendance,
          alreadyCheckedIn: true,
        };
      }
      const updated = await client.query(
        `
          UPDATE event_attendance
          SET check_in_at = NOW(), updated_at = NOW()
          WHERE id = $1
          RETURNING id, event_id, user_id, check_in_at, check_out_at, minutes, hours_entry_id, created_at, updated_at
        `,
        [attendance.id]
      );
      return { ...updated.rows[0], alreadyCheckedIn: false };
    }

    if (!attendance.check_in_at) {
      throw Object.assign(new Error('Volunteer must be checked in before checking out'), {
        statusCode: 400,
      });
    }

    if (attendance.check_out_at) {
      return { ...attendance, alreadyCheckedOut: true };
    }

    const checkInTime = new Date(attendance.check_in_at);
    const checkoutDate = new Date();
    const diffMs = Math.max(0, checkoutDate.getTime() - checkInTime.getTime());
    const minutesComputed = minutesOverride
      ? Number(minutesOverride)
      : Math.max(1, Math.round(diffMs / 60000));

    if (!Number.isFinite(minutesComputed) || minutesComputed <= 0) {
      throw Object.assign(new Error('Computed attendance minutes must be greater than zero'), {
        statusCode: 400,
      });
    }

    let hoursEntryId = attendance.hours_entry_id;
    if (!hoursEntryId) {
      const hoursId = randomUUID();
      const hoursResult = await client.query(
        `
          INSERT INTO volunteer_hours (id, user_id, event_id, minutes, note)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [hoursId, userId, eventId, minutesComputed, 'Auto-tracked via event attendance']
      );
      hoursEntryId = hoursResult.rows[0].id;
    }

    const updated = await client.query(
      `
        UPDATE event_attendance
        SET check_out_at = NOW(), minutes = $2, hours_entry_id = $3, updated_at = NOW()
        WHERE id = $1
        RETURNING id, event_id, user_id, check_in_at, check_out_at, minutes, hours_entry_id, created_at, updated_at
      `,
      [attendance.id, minutesComputed, hoursEntryId]
    );

    return { ...updated.rows[0], alreadyCheckedOut: false };
  });
}

async function listEventSignups(eventId, { client = pool } = {}) {
  const result = await client.query(
    `
      SELECT
        es.id,
        es.user_id,
        es.status,
        es.created_at,
        u.name,
        u.email,
        att.check_in_at,
        att.check_out_at,
        att.minutes
      FROM event_signups es
      JOIN users u ON u.id = es.user_id
      LEFT JOIN event_attendance att ON att.event_id = es.event_id AND att.user_id = es.user_id
      WHERE es.event_id = $1
      ORDER BY u.name ASC
    `,
    [eventId]
  );
  return result.rows.map((row) => ({
    signupId: row.id,
    userId: row.user_id,
    status: row.status,
    createdAt: toIso(row.created_at),
    name: row.name,
    email: row.email,
    checkInAt: toIso(row.check_in_at),
    checkOutAt: toIso(row.check_out_at),
    minutes: row.minutes,
  }));
}

async function getUserContact(userId, { client = pool } = {}) {
  const result = await client.query(`SELECT id, name, email FROM users WHERE id = $1`, [userId]);
  return result.rows[0] || null;
}

async function generateEventReport(eventId) {
  await ensureSchema();
  const event = await findEventById(eventId);
  if (!event) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }

  const [signupCountResult, checkedInResult, minutesResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::INT AS count FROM event_signups WHERE event_id = $1`, [eventId]),
    pool.query(
      `SELECT COUNT(*)::INT AS checked_in FROM event_attendance WHERE event_id = $1 AND check_in_at IS NOT NULL`,
      [eventId]
    ),
    pool.query(
      `SELECT COALESCE(SUM(minutes), 0)::INT AS total_minutes FROM volunteer_hours WHERE event_id = $1`,
      [eventId]
    ),
  ]);

  const totalSignups = Number(signupCountResult.rows[0]?.count || 0);
  const totalCheckedIn = Number(checkedInResult.rows[0]?.checked_in || 0);
  const totalMinutes = Number(minutesResult.rows[0]?.total_minutes || 0);
  const totalHours = totalMinutes / 60;
  const attendanceRate = totalSignups ? totalCheckedIn / totalSignups : 0;

  const reportResult = await pool.query(
    `
      INSERT INTO event_reports (event_id, total_signups, total_checked_in, total_hours, generated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (event_id)
      DO UPDATE SET
        total_signups = EXCLUDED.total_signups,
        total_checked_in = EXCLUDED.total_checked_in,
        total_hours = EXCLUDED.total_hours,
        generated_at = NOW()
      RETURNING event_id, total_signups, total_checked_in, total_hours, generated_at
    `,
    [eventId, totalSignups, totalCheckedIn, Math.round(totalHours)]
  );

  const reportRow = reportResult.rows[0];

  return {
    event: mapEventRow(event),
    totals: {
      totalSignups,
      totalCheckedIn,
      attendanceRate,
      totalHours,
    },
    storedReport: {
      eventId: reportRow.event_id,
      totalSignups: reportRow.total_signups,
      totalCheckedIn: reportRow.total_checked_in,
      totalHours: reportRow.total_hours,
      generatedAt: toIso(reportRow.generated_at),
    },
  };
}

async function getEventDetail(eventId) {
  await ensureSchema();
  const event = await findEventById(eventId);
  if (!event) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }

  const [tasks, assignments, signups] = await Promise.all([
    listTasksForEvent(eventId),
    listAssignmentsForEvent(eventId),
    listEventSignups(eventId),
  ]);

  return {
    event,
    tasks,
    assignments,
    signups,
  };
}

async function listEventCategories() {
  await ensureSchema();
  const result = await pool.query(`SELECT value, label FROM event_categories ORDER BY label ASC`);
  return result.rows;
}

async function findEventCategory(value) {
  if (!value) {
    return null;
  }
  await ensureSchema();
  const result = await pool.query(`SELECT value, label FROM event_categories WHERE value = $1`, [
    value,
  ]);
  return result.rows[0] || null;
}

async function listUsersWithRoles(roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) {
    return [];
  }

  const normalizedRoles = roles
    .map((role) => (typeof role === 'string' ? role.trim().toUpperCase() : ''))
    .filter(Boolean);

  if (!normalizedRoles.length) {
    return [];
  }

  await ensureSchema();

  const result = await pool.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT ur.role), NULL) AS roles,
        vp.skills,
        vp.interests,
        vp.availability,
        vp.state_code,
        vp.city_slug,
        vp.location,
        s.name AS state_name,
        c.name AS city_name
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN volunteer_profiles vp ON vp.user_id = u.id
      LEFT JOIN indian_states s ON s.code = vp.state_code
      LEFT JOIN indian_cities c ON c.slug = vp.city_slug
      WHERE ur.role = ANY($1::TEXT[])
      GROUP BY
        u.id,
        vp.skills,
        vp.interests,
        vp.availability,
        vp.state_code,
        vp.city_slug,
        vp.location,
        s.name,
        c.name
    `,
    [normalizedRoles]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    roles: Array.isArray(row.roles) ? row.roles : [],
    profile: {
      skills: Array.isArray(row.skills) ? row.skills : [],
      interests: Array.isArray(row.interests) ? row.interests : [],
      availability: row.availability || null,
      stateCode: row.state_code || null,
      citySlug: row.city_slug || null,
      location: row.location || null,
      stateName: row.state_name || null,
      cityName: row.city_name || null,
    },
  }));
}

async function upsertEventCategory({ value, label }) {
  await ensureSchema();
  const result = await pool.query(
    `
      INSERT INTO event_categories (value, label)
      VALUES ($1, $2)
      ON CONFLICT (value)
      DO UPDATE SET label = EXCLUDED.label, updated_at = NOW()
      RETURNING value, label
    `,
    [value, label]
  );
  return result.rows[0];
}

module.exports = {
  createEvent,
  updateEvent,
  setEventStatus,
  listEventsPendingApproval,
  setEventApprovalStatus,
  findEventById,
  listEventsForManager,
  replaceEventTasks,
  listTasksForEvent,
  listAssignmentsForEvent,
  assignVolunteers,
  recordAttendance,
  listEventSignups,
  getUserContact,
  generateEventReport,
  getEventDetail,
  withTransaction,
  listEventCategories,
  findEventCategory,
  upsertEventCategory,
  listUsersWithRoles,
};
