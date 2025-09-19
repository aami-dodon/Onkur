const { randomUUID } = require('crypto');
const pool = require('../common/db');
const { ensureSchema: ensureSponsorSchema } = require('../sponsors/sponsor.repository');
const { ensureSchema: ensureEventSchema } = require('../volunteer-journey/volunteerJourney.repository');

const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function mapMediaRow(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    eventId: row.event_id,
    uploaderId: row.uploader_id,
    storageKey: row.storage_key,
    url: row.url,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size || 0),
    width: row.width ? Number(row.width) : null,
    height: row.height ? Number(row.height) : null,
    caption: row.caption || '',
    tags: Array.isArray(row.tags) || typeof row.tags === 'object' ? row.tags : [],
    status: row.status,
    rejectionReason: row.rejection_reason || null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    approvedAt: toIso(row.approved_at),
    approvedBy: row.approved_by || null,
    moderationTimeMs: row.moderation_time_ms ? Number(row.moderation_time_ms) : null,
    sponsorMentions: row.sponsor_mentions ? Number(row.sponsor_mentions) : 0,
  };
}

const schemaPromise = (async () => {
  await ensureEventSchema();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_media (
      id UUID PRIMARY KEY,
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      storage_key TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      width INTEGER NULL,
      height INTEGER NULL,
      caption TEXT NULL,
      tags JSONB NOT NULL DEFAULT '[]'::JSONB,
      status TEXT NOT NULL DEFAULT 'PENDING',
      rejection_reason TEXT NULL,
      sponsor_mentions INTEGER NOT NULL DEFAULT 0,
      moderation_time_ms BIGINT NULL,
      approved_at TIMESTAMPTZ NULL,
      approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_event_media_event ON event_media (event_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_event_media_status ON event_media (status)`);
  await pool.query(`ALTER TABLE event_media ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL`);
  await pool.query(`ALTER TABLE event_media ADD COLUMN IF NOT EXISTS sponsor_mentions INTEGER NOT NULL DEFAULT 0`);
  await pool.query(`ALTER TABLE event_media ADD COLUMN IF NOT EXISTS moderation_time_ms BIGINT NULL`);
  await pool.query(`ALTER TABLE event_media ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL`);
  await pool.query(`ALTER TABLE event_media ADD COLUMN IF NOT EXISTS approved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE event_media ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  try {
    await pool.query(`ALTER TABLE event_media ALTER COLUMN tags SET DATA TYPE JSONB USING tags::JSONB`);
  } catch (error) {
    if (!/kw_using/i.test(error.message || '')) {
      throw error;
    }
  }
  await pool.query(`
    ALTER TABLE event_media
    DROP CONSTRAINT IF EXISTS event_media_status_check
  `);
  await pool.query(`
    ALTER TABLE event_media
    ADD CONSTRAINT event_media_status_check
    CHECK (status = ANY(ARRAY['PENDING','APPROVED','REJECTED']::TEXT[]))
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_gallery_metrics (
      event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
      view_count BIGINT NOT NULL DEFAULT 0,
      last_viewed_at TIMESTAMPTZ NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
})();

async function ensureSchema() {
  await schemaPromise;
}

async function createMedia({
  eventId,
  uploaderId,
  storageKey,
  url,
  mimeType,
  fileSize,
  width = null,
  height = null,
  caption = '',
  tags = [],
  status = 'PENDING',
  sponsorMentions = 0,
}) {
  await ensureSchema();
  if (!VALID_STATUSES.includes(status)) {
    throw Object.assign(new Error('Invalid media status'), { statusCode: 400 });
  }
  const id = randomUUID();
  const result = await pool.query(
    `
      INSERT INTO event_media (
        id,
        event_id,
        uploader_id,
        storage_key,
        url,
        mime_type,
        file_size,
        width,
        height,
        caption,
        tags,
        status,
        sponsor_mentions
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
        $13
      )
      RETURNING *
    `,
    [
      id,
      eventId,
      uploaderId,
      storageKey,
      url,
      mimeType,
      fileSize,
      width,
      height,
      caption,
      JSON.stringify(tags || []),
      status,
      sponsorMentions,
    ],
  );
  return mapMediaRow(result.rows[0]);
}

async function findMediaById(mediaId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT *
      FROM event_media
      WHERE id = $1
    `,
    [mediaId],
  );
  return mapMediaRow(result.rows[0]);
}

async function listApprovedMediaForEvent(eventId, { page = 1, pageSize = 20 } = {}) {
  await ensureSchema();
  const limit = Math.max(1, Math.min(Number(pageSize) || 20, 48));
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * limit;

  const [itemsResult, countResult] = await Promise.all([
    pool.query(
      `
        SELECT *
        FROM event_media
        WHERE event_id = $1 AND status = 'APPROVED'
        ORDER BY approved_at DESC NULLS LAST, created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [eventId, limit, offset],
    ),
    pool.query(
      `
        SELECT COUNT(*)::BIGINT AS total
        FROM event_media
        WHERE event_id = $1 AND status = 'APPROVED'
      `,
      [eventId],
    ),
  ]);

  const total = Number(countResult.rows[0]?.total || 0);
  const media = itemsResult.rows.map(mapMediaRow);
  const hasMore = offset + media.length < total;

  return {
    media,
    page: currentPage,
    pageSize: limit,
    total,
    hasMore,
  };
}

async function listPendingMedia({ page = 1, pageSize = 20 } = {}) {
  await ensureSchema();
  const limit = Math.max(1, Math.min(Number(pageSize) || 20, 50));
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * limit;

  const [itemsResult, countResult] = await Promise.all([
    pool.query(
      `
        SELECT *
        FROM event_media
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    ),
    pool.query(
      `
        SELECT COUNT(*)::BIGINT AS total
        FROM event_media
        WHERE status = 'PENDING'
      `,
    ),
  ]);

  const total = Number(countResult.rows[0]?.total || 0);
  const media = itemsResult.rows.map(mapMediaRow);
  const hasMore = offset + media.length < total;

  return {
    media,
    page: currentPage,
    pageSize: limit,
    total,
    hasMore,
  };
}

async function updateMediaStatus(mediaId, { status, approvedBy = null, rejectionReason = null }) {
  await ensureSchema();
  if (!VALID_STATUSES.includes(status)) {
    throw Object.assign(new Error('Invalid media status'), { statusCode: 400 });
  }
  const fields = ['status = $2', 'updated_at = NOW()'];
  const values = [mediaId, status];
  if (status === 'APPROVED') {
    fields.push('approved_at = NOW()');
    if (approvedBy) {
      fields.push('approved_by = $' + (values.length + 1));
      values.push(approvedBy);
    } else {
      fields.push('approved_by = NULL');
    }
    fields.push('rejection_reason = NULL');
  }
  if (status === 'REJECTED') {
    fields.push('approved_at = NULL');
    fields.push('approved_by = NULL');
    fields.push('rejection_reason = $' + (values.length + 1));
    values.push(rejectionReason || '');
  }
  const media = await findMediaById(mediaId);
  if (!media) {
    throw Object.assign(new Error('Media not found'), { statusCode: 404 });
  }
  const moderationFields = [];
  if (media.status === 'PENDING' && status !== 'PENDING') {
    moderationFields.push('moderation_time_ms = EXTRACT(EPOCH FROM (NOW() - created_at)) * 1000');
  }
  const sql = `
    UPDATE event_media
    SET ${fields.concat(moderationFields).join(', ')}
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(sql, values);
  return mapMediaRow(result.rows[0]);
}

async function updateSponsorMentions(mediaId, sponsorMentions) {
  await ensureSchema();
  const result = await pool.query(
    `
      UPDATE event_media
      SET sponsor_mentions = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [mediaId, Number(sponsorMentions) || 0],
  );
  return mapMediaRow(result.rows[0]);
}

async function incrementGalleryView(eventId) {
  await ensureSchema();
  await pool.query(
    `
      INSERT INTO event_gallery_metrics (event_id, view_count, last_viewed_at)
      VALUES ($1, 1, NOW())
      ON CONFLICT (event_id)
      DO UPDATE SET view_count = event_gallery_metrics.view_count + 1, last_viewed_at = NOW(), updated_at = NOW()
    `,
    [eventId],
  );
}

async function getGalleryMetrics(eventId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT view_count, last_viewed_at
      FROM event_gallery_metrics
      WHERE event_id = $1
    `,
    [eventId],
  );
  const row = result.rows[0] || null;
  if (!row) {
    return { viewCount: 0, lastViewedAt: null };
  }
  return {
    viewCount: Number(row.view_count || 0),
    lastViewedAt: toIso(row.last_viewed_at),
  };
}

async function listGalleryEvents({ page = 1, pageSize = 12 } = {}) {
  await ensureSchema();
  const limit = Math.max(1, Math.min(Number(pageSize) || 12, 24));
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * limit;
  const [itemsResult, countResult] = await Promise.all([
    pool.query(
      `
        SELECT e.id, e.title, e.date_start, e.date_end, e.location, e.location_state_code, e.location_city_slug,
               e.category, e.theme,
               COUNT(em.id)::INT AS media_count,
               MAX(em.approved_at) AS last_media_at
        FROM events e
        JOIN event_media em ON em.event_id = e.id AND em.status = 'APPROVED'
        GROUP BY e.id
        ORDER BY last_media_at DESC NULLS LAST, e.date_start DESC NULLS LAST
        LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    ),
    pool.query(
      `
        SELECT COUNT(*)::BIGINT AS total
        FROM (
          SELECT 1
          FROM events e
          JOIN event_media em ON em.event_id = e.id AND em.status = 'APPROVED'
          GROUP BY e.id
        ) counted
      `,
    ),
  ]);

  const total = Number(countResult.rows[0]?.total || 0);
  const events = itemsResult.rows.map((row) => ({
    id: row.id,
    title: row.title,
    dateStart: toIso(row.date_start),
    dateEnd: toIso(row.date_end),
    location: row.location,
    stateCode: row.location_state_code || null,
    citySlug: row.location_city_slug || null,
    category: row.category || null,
    theme: row.theme || null,
    mediaCount: Number(row.media_count || 0),
    lastMediaAt: toIso(row.last_media_at),
  }));
  const hasMore = offset + events.length < total;
  return {
    events,
    page: currentPage,
    pageSize: limit,
    total,
    hasMore,
  };
}

async function listEventVolunteers(eventId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT u.id, u.name, u.email
      FROM event_signups es
      JOIN users u ON u.id = es.user_id
      WHERE es.event_id = $1
      ORDER BY u.name ASC
    `,
    [eventId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
  }));
}

async function isVolunteerForEvent(eventId, userId) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT 1 FROM event_signups WHERE event_id = $1 AND user_id = $2 LIMIT 1`,
    [eventId, userId],
  );
  return Boolean(result.rows[0]);
}

async function listSponsors() {
  await ensureSchema();
  await ensureSponsorSchema();
  const result = await pool.query(
    `
      SELECT sp.user_id AS id, sp.org_name AS name, u.email, sp.logo_url
      FROM sponsor_profiles sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.status = 'APPROVED'
      ORDER BY sp.org_name ASC
    `,
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    logoUrl: row.logo_url || null,
  }));
}

module.exports = {
  ensureSchema,
  createMedia,
  findMediaById,
  listApprovedMediaForEvent,
  listPendingMedia,
  updateMediaStatus,
  updateSponsorMentions,
  incrementGalleryView,
  getGalleryMetrics,
  listGalleryEvents,
  listEventVolunteers,
  isVolunteerForEvent,
  listSponsors,
};
