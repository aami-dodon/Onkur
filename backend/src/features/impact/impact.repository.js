const { randomUUID } = require('crypto');
const pool = require('../common/db');
const { ensureSchema: ensureVolunteerSchema } = require('../volunteer-journey/volunteerJourney.repository');
const { ensureSchema: ensureSponsorSchema } = require('../sponsors/sponsor.repository');

const STORY_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function normalizeJsonArray(value, fallback = []) {
  if (!value) {
    return fallback;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return fallback;
    }
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function mapStoryRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    eventId: row.event_id,
    authorId: row.author_id,
    authorName: row.author_name || null,
    authorEmail: row.author_email || null,
    title: row.title,
    body: row.body,
    mediaIds: normalizeJsonArray(row.media_ids, []),
    status: row.status,
    rejectionReason: row.rejection_reason || null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    approvedAt: toIso(row.approved_at),
    approvedBy: row.approved_by || null,
    publishedAt: toIso(row.published_at),
  };
}

function mapDailyMetricRow(row) {
  if (!row) {
    return null;
  }
  return {
    date: row.date ? toIso(row.date)?.slice(0, 10) : null,
    metricKey: row.metric_key,
    value: Number(row.value || 0),
  };
}

const schemaPromise = (async () => {
  await ensureVolunteerSchema();
  await ensureSponsorSchema();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_stories (
      id UUID PRIMARY KEY,
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      media_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
      status TEXT NOT NULL DEFAULT 'PENDING',
      rejection_reason TEXT NULL,
      approved_at TIMESTAMPTZ NULL,
      approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      published_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE event_stories
    DROP CONSTRAINT IF EXISTS event_stories_status_check
  `);
  await pool.query(`
    ALTER TABLE event_stories
    ADD CONSTRAINT event_stories_status_check
    CHECK (status = ANY(ARRAY['PENDING','APPROVED','REJECTED']::TEXT[]))
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_event_stories_event_status ON event_stories (event_id, status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_event_stories_created ON event_stories (created_at DESC)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS analytics_daily (
      date DATE NOT NULL,
      metric_key TEXT NOT NULL,
      value NUMERIC(20,4) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (date, metric_key)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_analytics_daily_metric ON analytics_daily (metric_key, date DESC)`);
})();

async function ensureSchema() {
  await schemaPromise;
}

function sanitizeStatus(status) {
  if (!status) {
    return null;
  }
  const value = String(status).trim().toUpperCase();
  return STORY_STATUSES.includes(value) ? value : null;
}

async function createStory({ eventId, authorId, title, body, mediaIds = [] }) {
  await ensureSchema();
  const id = randomUUID();
  const result = await pool.query(
    `
      INSERT INTO event_stories (id, event_id, author_id, title, body, media_ids)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [id, eventId, authorId, title, body, JSON.stringify(mediaIds || [])],
  );
  return mapStoryRow(result.rows[0]);
}

async function findStoryById(storyId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT s.*, u.name AS author_name, u.email AS author_email
      FROM event_stories s
      JOIN users u ON u.id = s.author_id
      WHERE s.id = $1
    `,
    [storyId],
  );
  return mapStoryRow(result.rows[0]);
}

async function listStoriesForEvent(eventId, { statuses = ['APPROVED'], limit = 12 } = {}) {
  await ensureSchema();
  const normalizedStatuses = Array.isArray(statuses)
    ? statuses.map((status) => sanitizeStatus(status)).filter(Boolean)
    : [];
  const effectiveStatuses = normalizedStatuses.length ? normalizedStatuses : ['APPROVED'];
  const safeLimit = Math.max(1, Math.min(Number(limit) || 12, 50));
  const result = await pool.query(
    `
      SELECT s.*, u.name AS author_name, u.email AS author_email
      FROM event_stories s
      JOIN users u ON u.id = s.author_id
      WHERE s.event_id = $1 AND s.status = ANY($2::TEXT[])
      ORDER BY COALESCE(s.published_at, s.created_at) DESC
      LIMIT $3
    `,
    [eventId, effectiveStatuses, safeLimit],
  );
  return result.rows.map(mapStoryRow);
}

async function listStoriesForModeration({ page = 1, pageSize = 20, status = 'PENDING' } = {}) {
  await ensureSchema();
  const normalizedStatus = sanitizeStatus(status) || 'PENDING';
  const limit = Math.max(1, Math.min(Number(pageSize) || 20, 50));
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * limit;
  const result = await pool.query(
    `
      SELECT s.*, u.name AS author_name, u.email AS author_email, e.title AS event_title
      FROM event_stories s
      JOIN users u ON u.id = s.author_id
      JOIN events e ON e.id = s.event_id
      WHERE s.status = $1
      ORDER BY s.created_at ASC
      LIMIT $2 OFFSET $3
    `,
    [normalizedStatus, limit, offset],
  );
  const totalResult = await pool.query(`SELECT COUNT(*)::INT AS count FROM event_stories WHERE status = $1`, [normalizedStatus]);
  return {
    items: result.rows.map((row) => ({ ...mapStoryRow(row), eventTitle: row.event_title || null })),
    page: currentPage,
    pageSize: limit,
    total: Number(totalResult.rows[0]?.count || 0),
  };
}

async function updateStoryStatus({ storyId, status, moderatorId, rejectionReason = null }) {
  await ensureSchema();
  const normalized = sanitizeStatus(status);
  if (!normalized) {
    throw Object.assign(new Error('Invalid story status'), { statusCode: 400 });
  }
  const result = await pool.query(
    `
      UPDATE event_stories
      SET status = $2,
          rejection_reason = CASE WHEN $2 = 'REJECTED' THEN $3 ELSE NULL END,
          approved_at = CASE WHEN $2 = 'APPROVED' THEN NOW() ELSE NULL END,
          approved_by = $4,
          published_at = CASE WHEN $2 = 'APPROVED' THEN NOW() ELSE published_at END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [storyId, normalized, rejectionReason, moderatorId || null],
  );
  if (!result.rows[0]) {
    return null;
  }
  return findStoryById(storyId);
}

async function incrementDailyMetric({ metricKey, amount = 1, date = new Date() }) {
  await ensureSchema();
  if (!metricKey) {
    throw new Error('Metric key is required');
  }
  const asNumber = Number(amount || 0);
  if (!Number.isFinite(asNumber)) {
    throw new Error('Metric amount must be a finite number');
  }
  const day = new Date(date);
  if (Number.isNaN(day.getTime())) {
    throw new Error('Invalid metric date');
  }
  const isoDate = day.toISOString().slice(0, 10);
  await pool.query(
    `
      INSERT INTO analytics_daily (date, metric_key, value)
      VALUES ($1, $2, $3)
      ON CONFLICT (date, metric_key)
      DO UPDATE SET value = analytics_daily.value + EXCLUDED.value, updated_at = NOW()
    `,
    [isoDate, metricKey, asNumber],
  );
}

async function listRecentMetrics({ metricKeys = [], days = 30 } = {}) {
  await ensureSchema();
  const limitDays = Math.max(1, Math.min(Number(days) || 30, 90));
  let whereClause = 'date >= CURRENT_DATE - $1::INTERVAL';
  const values = [`${limitDays} days`];
  if (Array.isArray(metricKeys) && metricKeys.length) {
    whereClause += ' AND metric_key = ANY($2::TEXT[])';
    values.push(metricKeys.map((key) => String(key)));
  }
  const result = await pool.query(
    `
      SELECT date, metric_key, value
      FROM analytics_daily
      WHERE ${whereClause}
      ORDER BY date ASC, metric_key ASC
    `,
    values,
  );
  return result.rows.map(mapDailyMetricRow);
}

async function getStoryCountsByStatus() {
  await ensureSchema();
  const result = await pool.query(
    `SELECT status, COUNT(*)::INT AS count FROM event_stories GROUP BY status`
  );
  return result.rows.reduce((acc, row) => {
    acc[row.status] = Number(row.count || 0);
    return acc;
  }, {});
}

async function getVolunteerHoursAggregate() {
  await ensureSchema();
  const [totalMinutesResult, recentHoursResult] = await Promise.all([
    pool.query('SELECT COALESCE(SUM(minutes),0)::BIGINT AS total_minutes FROM volunteer_hours'),
    pool.query(
      `
        SELECT
          COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '90 days' THEN user_id END)::INT AS active_90,
          COUNT(DISTINCT CASE WHEN created_at BETWEEN NOW() - INTERVAL '180 days' AND NOW() - INTERVAL '91 days' THEN user_id END)::INT AS previous_90
        FROM volunteer_hours
      `,
    ),
  ]);
  return {
    totalMinutes: Number(totalMinutesResult.rows[0]?.total_minutes || 0),
    activeLast90Days: Number(recentHoursResult.rows[0]?.active_90 || 0),
    previous90Days: Number(recentHoursResult.rows[0]?.previous_90 || 0),
  };
}

async function getEventParticipationSummary() {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        COUNT(*)::BIGINT AS total_signups,
        COUNT(DISTINCT user_id)::INT AS unique_volunteers,
        COUNT(DISTINCT event_id)::INT AS events_supported
      FROM event_signups
    `,
  );
  return {
    totalSignups: Number(result.rows[0]?.total_signups || 0),
    uniqueVolunteers: Number(result.rows[0]?.unique_volunteers || 0),
    eventsSupported: Number(result.rows[0]?.events_supported || 0),
  };
}

async function getGalleryEngagementSummary() {
  await ensureSchema();
  const [viewsResult, mediaResult] = await Promise.all([
    pool.query('SELECT COALESCE(SUM(view_count),0)::BIGINT AS total_views, COUNT(*)::INT AS tracked_events FROM event_gallery_metrics'),
    pool.query(
      `
        SELECT COUNT(*)::INT AS approved_media
        FROM event_media
        WHERE status = 'APPROVED'
      `,
    ),
  ]);
  return {
    totalViews: Number(viewsResult.rows[0]?.total_views || 0),
    trackedEvents: Number(viewsResult.rows[0]?.tracked_events || 0),
    approvedMedia: Number(mediaResult.rows[0]?.approved_media || 0),
  };
}

async function getSponsorImpactSummary() {
  await ensureSchema();
  const [sponsorshipsResult, impressionsResult] = await Promise.all([
    pool.query(
      `
        SELECT
          COUNT(*)::INT AS approved_sponsorships,
          COALESCE(SUM(amount),0)::NUMERIC AS approved_amount
        FROM sponsorships
        WHERE status = 'APPROVED'
      `,
    ),
    pool.query(
      `
        SELECT COALESCE(SUM(sponsor_mentions),0)::BIGINT AS sponsor_mentions
        FROM event_media
        WHERE status = 'APPROVED'
      `,
    ),
  ]);
  return {
    approvedSponsorships: Number(sponsorshipsResult.rows[0]?.approved_sponsorships || 0),
    approvedAmount: Number(sponsorshipsResult.rows[0]?.approved_amount || 0),
    sponsorMentions: Number(impressionsResult.rows[0]?.sponsor_mentions || 0),
  };
}

async function getAnalyticsUsageSummary() {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        COALESCE(SUM(CASE WHEN metric_key = 'analytics_dashboard_views' AND date >= CURRENT_DATE - INTERVAL '30 days' THEN value ELSE 0 END), 0) AS views30,
        COALESCE(SUM(CASE WHEN metric_key = 'analytics_dashboard_views' THEN value ELSE 0 END), 0) AS total_views
      FROM analytics_daily
    `,
  );
  return {
    viewsLast30Days: Number(result.rows[0]?.views30 || 0),
    totalRecordedViews: Number(result.rows[0]?.total_views || 0),
  };
}

async function listEventSponsorsWithContacts(eventId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT sp.user_id, sp.org_name, sp.contact_name, sp.contact_email, u.email AS fallback_email
      FROM sponsorships s
      JOIN sponsor_profiles sp ON sp.user_id = s.sponsor_id
      JOIN users u ON u.id = sp.user_id
      WHERE s.event_id = $1 AND sp.status = 'APPROVED' AND s.status = 'APPROVED'
    `,
    [eventId],
  );
  return result.rows.map((row) => ({
    sponsorId: row.user_id,
    orgName: row.org_name,
    contactName: row.contact_name || null,
    contactEmail: row.contact_email || row.fallback_email || null,
  }));
}

module.exports = {
  STORY_STATUSES,
  ensureSchema,
  createStory,
  findStoryById,
  listStoriesForEvent,
  listStoriesForModeration,
  updateStoryStatus,
  incrementDailyMetric,
  listRecentMetrics,
  getStoryCountsByStatus,
  getVolunteerHoursAggregate,
  getEventParticipationSummary,
  getGalleryEngagementSummary,
  getSponsorImpactSummary,
  getAnalyticsUsageSummary,
  listEventSponsorsWithContacts,
};
