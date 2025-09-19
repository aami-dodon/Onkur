const { randomUUID } = require('crypto');
const pool = require('../common/db');

const VALID_PROFILE_STATUSES = ['PENDING', 'APPROVED', 'DECLINED'];
const VALID_SPONSORSHIP_TYPES = ['FUNDS', 'IN_KIND'];
const VALID_SPONSORSHIP_STATUSES = ['PENDING', 'APPROVED', 'DECLINED'];

function normalizeJson(value, fallback = {}) {
  if (!value) {
    return fallback;
  }
  if (typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return fallback;
    }
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function mapProfileRow(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    orgName: row.org_name,
    logoUrl: row.logo_url || null,
    website: row.website || null,
    contactName: row.contact_name || null,
    contactEmail: row.contact_email || null,
    contactPhone: row.contact_phone || null,
    brandAssets: normalizeJson(row.brand_assets || {}),
    status: row.status,
    approvedAt: toIso(row.approved_at),
    lastReportSentAt: toIso(row.last_report_sent_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapSponsorshipRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    sponsorId: row.sponsor_id,
    eventId: row.event_id,
    type: row.type,
    amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
    notes: row.notes || null,
    status: row.status,
    approvedAt: toIso(row.approved_at),
    pledgedAt: toIso(row.pledged_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    reportSnapshot: normalizeJson(row.report_snapshot || {}),
  };
}

const schemaPromise = (async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sponsor_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      org_name TEXT NOT NULL,
      logo_url TEXT NULL,
      website TEXT NULL,
      contact_name TEXT NULL,
      contact_email TEXT NULL,
      contact_phone TEXT NULL,
      brand_assets JSONB NOT NULL DEFAULT '{}'::JSONB,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status = ANY(ARRAY['PENDING','APPROVED','DECLINED']::TEXT[])),
      approved_at TIMESTAMPTZ NULL,
      last_report_sent_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sponsorships (
      id UUID PRIMARY KEY,
      sponsor_id UUID NOT NULL REFERENCES sponsor_profiles(user_id) ON DELETE CASCADE,
      event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type = ANY(ARRAY['FUNDS','IN_KIND']::TEXT[])),
      amount NUMERIC(12,2) NULL,
      notes TEXT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status = ANY(ARRAY['PENDING','APPROVED','DECLINED']::TEXT[])),
      approved_at TIMESTAMPTZ NULL,
      pledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      report_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sponsorships_event ON sponsorships (event_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sponsorships_sponsor ON sponsorships (sponsor_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sponsor_profiles_status ON sponsor_profiles (status)`);
})();

async function ensureSchema() {
  await schemaPromise;
}

function sanitizeStatus(status, allowed) {
  if (!status) return null;
  const value = String(status).trim().toUpperCase();
  return allowed.includes(value) ? value : null;
}

function sanitizeType(type) {
  if (!type) return null;
  const value = String(type).trim().toUpperCase();
  return VALID_SPONSORSHIP_TYPES.includes(value) ? value : null;
}

async function applySponsorProfile({
  userId,
  orgName,
  logoUrl = null,
  website = null,
  contactName = null,
  contactEmail = null,
  contactPhone = null,
  brandAssets = {},
}) {
  await ensureSchema();
  const normalizedAssets = normalizeJson(brandAssets, {});
  const result = await pool.query(
    `
      INSERT INTO sponsor_profiles (
        user_id,
        org_name,
        logo_url,
        website,
        contact_name,
        contact_email,
        contact_phone,
        brand_assets,
        status,
        approved_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',NULL)
      ON CONFLICT (user_id)
      DO UPDATE SET
        org_name = EXCLUDED.org_name,
        logo_url = EXCLUDED.logo_url,
        website = EXCLUDED.website,
        contact_name = EXCLUDED.contact_name,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        brand_assets = EXCLUDED.brand_assets,
        status = 'PENDING',
        approved_at = NULL,
        updated_at = NOW()
      RETURNING *
    `,
    [
      userId,
      orgName,
      logoUrl,
      website,
      contactName,
      contactEmail,
      contactPhone,
      JSON.stringify(normalizedAssets),
    ],
  );
  return mapProfileRow(result.rows[0]);
}

async function updateSponsorProfile(userId, updates = {}) {
  await ensureSchema();
  const fields = [];
  const values = [];
  const columns = new Map([
    ['orgName', 'org_name'],
    ['logoUrl', 'logo_url'],
    ['website', 'website'],
    ['contactName', 'contact_name'],
    ['contactEmail', 'contact_email'],
    ['contactPhone', 'contact_phone'],
  ]);

  for (const [key, column] of columns.entries()) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      fields.push(`${column} = $${fields.length + 1}`);
      values.push(updates[key]);
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'brandAssets')) {
    fields.push(`brand_assets = $${fields.length + 1}`);
    values.push(JSON.stringify(normalizeJson(updates.brandAssets, {})));
  }

  if (!fields.length) {
    const existing = await findSponsorProfile(userId);
    if (!existing) {
      throw Object.assign(new Error('Sponsor profile not found'), { statusCode: 404 });
    }
    return existing;
  }

  values.push(userId);
  const result = await pool.query(
    `
      UPDATE sponsor_profiles
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE user_id = $${values.length}
      RETURNING *
    `,
    values,
  );

  if (!result.rows[0]) {
    throw Object.assign(new Error('Sponsor profile not found'), { statusCode: 404 });
  }

  return mapProfileRow(result.rows[0]);
}

async function findSponsorProfile(userId) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM sponsor_profiles WHERE user_id = $1`,
    [userId],
  );
  return mapProfileRow(result.rows[0]);
}

async function listSponsorProfiles({ statuses } = {}) {
  await ensureSchema();
  let where = '';
  const values = [];
  if (Array.isArray(statuses) && statuses.length) {
    const normalized = statuses
      .map((status) => sanitizeStatus(status, VALID_PROFILE_STATUSES))
      .filter(Boolean);
    if (normalized.length) {
      values.push(normalized);
      where = `WHERE status = ANY($${values.length}::TEXT[])`;
    }
  }
  const result = await pool.query(
    `SELECT * FROM sponsor_profiles ${where} ORDER BY created_at DESC`,
    values,
  );
  return result.rows.map(mapProfileRow);
}

async function setSponsorStatus({ userId, status }) {
  await ensureSchema();
  const normalized = sanitizeStatus(status, VALID_PROFILE_STATUSES);
  if (!normalized) {
    throw Object.assign(new Error('Invalid sponsor status'), { statusCode: 400 });
  }
  const result = await pool.query(
    `
      UPDATE sponsor_profiles
      SET status = $2,
          approved_at = CASE WHEN $2 = 'APPROVED' THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `,
    [userId, normalized],
  );
  if (!result.rows[0]) {
    throw Object.assign(new Error('Sponsor profile not found'), { statusCode: 404 });
  }
  if (normalized !== 'APPROVED') {
    await pool.query(
      `
        UPDATE sponsorships
        SET status = $3,
            approved_at = CASE WHEN $3 = 'APPROVED' THEN NOW() ELSE NULL END,
            updated_at = NOW()
        WHERE sponsor_id = $1 AND status <> $3
      `,
      [userId, normalized, normalized],
    );
  }
  return mapProfileRow(result.rows[0]);
}

async function createSponsorship({ sponsorId, eventId, type, amount = null, notes = null, status = 'PENDING' }) {
  await ensureSchema();
  const normalizedType = sanitizeType(type);
  if (!normalizedType) {
    throw Object.assign(new Error('Invalid sponsorship type'), { statusCode: 400 });
  }
  const normalizedStatus = sanitizeStatus(status, VALID_SPONSORSHIP_STATUSES) || 'PENDING';
  const id = randomUUID();
  const result = await pool.query(
    `
      INSERT INTO sponsorships (
        id, sponsor_id, event_id, type, amount, notes, status, approved_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7, CASE WHEN $7 = 'APPROVED' THEN NOW() ELSE NULL END)
      RETURNING *
    `,
    [id, sponsorId, eventId, normalizedType, amount, notes, normalizedStatus],
  );
  return mapSponsorshipRow(result.rows[0]);
}

async function listSponsorshipsForSponsor(sponsorId) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT s.*, e.title AS event_title, e.date_start, e.date_end, e.location
      FROM sponsorships s
      JOIN events e ON e.id = s.event_id
      WHERE s.sponsor_id = $1
      ORDER BY s.created_at DESC
    `,
    [sponsorId],
  );
  return result.rows.map((row) => ({
    ...mapSponsorshipRow(row),
    event: {
      id: row.event_id,
      title: row.event_title,
      dateStart: toIso(row.date_start),
      dateEnd: toIso(row.date_end),
      location: row.location,
    },
  }));
}

async function listApprovedEventSponsors(eventIds = []) {
  await ensureSchema();
  if (!Array.isArray(eventIds) || !eventIds.length) {
    return new Map();
  }
  const result = await pool.query(
    `
      SELECT s.event_id, sp.user_id, sp.org_name, sp.logo_url, sp.website, s.type, s.amount
      FROM sponsorships s
      JOIN sponsor_profiles sp ON sp.user_id = s.sponsor_id
      WHERE s.event_id = ANY($1::UUID[])
        AND sp.status = 'APPROVED'
        AND s.status = 'APPROVED'
      ORDER BY sp.org_name ASC
    `,
    [eventIds],
  );
  const map = new Map();
  for (const row of result.rows) {
    if (!map.has(row.event_id)) {
      map.set(row.event_id, []);
    }
    map.get(row.event_id).push({
      sponsorId: row.user_id,
      orgName: row.org_name,
      logoUrl: row.logo_url || null,
      website: row.website || null,
      type: row.type,
      amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
    });
  }
  return map;
}

async function listEventSponsorshipsForSponsor({ sponsorId, eventIds = [] }) {
  await ensureSchema();
  if (!Array.isArray(eventIds) || !eventIds.length) {
    return new Map();
  }
  const result = await pool.query(
    `
      SELECT *
      FROM sponsorships
      WHERE sponsor_id = $1 AND event_id = ANY($2::UUID[])
      ORDER BY created_at DESC
    `,
    [sponsorId, eventIds],
  );
  const map = new Map();
  for (const row of result.rows) {
    map.set(row.event_id, mapSponsorshipRow(row));
  }
  return map;
}

async function updateSponsorshipStatus({ sponsorshipId, status }) {
  await ensureSchema();
  const normalized = sanitizeStatus(status, VALID_SPONSORSHIP_STATUSES);
  if (!normalized) {
    throw Object.assign(new Error('Invalid sponsorship status'), { statusCode: 400 });
  }
  const result = await pool.query(
    `
      UPDATE sponsorships
      SET status = $2,
          approved_at = CASE WHEN $2 = 'APPROVED' THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [sponsorshipId, normalized],
  );
  if (!result.rows[0]) {
    throw Object.assign(new Error('Sponsorship not found'), { statusCode: 404 });
  }
  return mapSponsorshipRow(result.rows[0]);
}

async function upsertReportSnapshot({ sponsorshipId, snapshot }) {
  await ensureSchema();
  const result = await pool.query(
    `
      UPDATE sponsorships
      SET report_snapshot = $2::JSONB,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [sponsorshipId, JSON.stringify(normalizeJson(snapshot, {}))],
  );
  if (!result.rows[0]) {
    throw Object.assign(new Error('Sponsorship not found'), { statusCode: 404 });
  }
  return mapSponsorshipRow(result.rows[0]);
}

async function markReportDelivered({ sponsorId }) {
  await ensureSchema();
  const result = await pool.query(
    `
      UPDATE sponsor_profiles
      SET last_report_sent_at = NOW(), updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `,
    [sponsorId],
  );
  return mapProfileRow(result.rows[0]);
}

module.exports = {
  ensureSchema,
  applySponsorProfile,
  updateSponsorProfile,
  findSponsorProfile,
  listSponsorProfiles,
  setSponsorStatus,
  createSponsorship,
  listSponsorshipsForSponsor,
  listApprovedEventSponsors,
  listEventSponsorshipsForSponsor,
  updateSponsorshipStatus,
  upsertReportSnapshot,
  markReportDelivered,
};
