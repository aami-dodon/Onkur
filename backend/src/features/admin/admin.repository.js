const pool = require('../common/db');

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

function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    approvalStatus: row.approval_status,
    approvalReason: row.approval_reason || null,
    submittedAt: toIso(row.submitted_at),
    approvedAt: toIso(row.approved_at),
    dateStart: toIso(row.date_start),
    dateEnd: toIso(row.date_end),
    location: row.location || null,
    capacity: row.capacity ? Number(row.capacity) : null,
    signupCount: row.signup_count ? Number(row.signup_count) : 0,
    manager: row.manager_id
      ? {
          id: row.manager_id,
          name: row.manager_name,
          email: row.manager_email,
        }
      : null,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapSponsor(row) {
  return {
    userId: row.user_id,
    orgName: row.org_name,
    status: row.status,
    contactName: row.contact_name || null,
    contactEmail: row.contact_email || row.user_email || null,
    submittedAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapMedia(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    uploaderId: row.uploader_id,
    status: row.status,
    createdAt: toIso(row.created_at),
    url: row.url,
    caption: row.caption || null,
    eventTitle: row.event_title || null,
    uploaderName: row.uploader_name || null,
  };
}

async function listPendingEvents() {
  const result = await pool.query(
    `
      SELECT
        e.id,
        e.title,
        e.status,
        e.approval_status,
        e.approval_reason,
        e.submitted_at,
        e.approved_at,
        e.date_start,
        e.date_end,
        e.location,
        e.capacity,
        e.created_at,
        e.updated_at,
        COALESCE(sc.signup_count, 0) AS signup_count,
        u.id AS manager_id,
        u.name AS manager_name,
        u.email AS manager_email
      FROM events e
      LEFT JOIN (
        SELECT event_id, COUNT(*)::INT AS signup_count
        FROM event_signups
        GROUP BY event_id
      ) sc ON sc.event_id = e.id
      LEFT JOIN users u ON u.id = e.created_by
      WHERE e.approval_status = 'PENDING'
      ORDER BY e.submitted_at DESC NULLS LAST, e.created_at DESC
    `
  );
  return result.rows.map(mapEvent);
}

async function listPendingSponsorApplications() {
  const result = await pool.query(
    `
      SELECT
        sp.user_id,
        sp.org_name,
        sp.status,
        sp.contact_name,
        sp.contact_email,
        sp.created_at,
        sp.updated_at,
        u.email AS user_email
      FROM sponsor_profiles sp
      LEFT JOIN users u ON u.id = sp.user_id
      WHERE sp.status = 'PENDING'
      ORDER BY sp.created_at ASC
    `
  );
  return result.rows.map(mapSponsor);
}

async function listPendingMedia() {
  const result = await pool.query(
    `
      SELECT
        em.id,
        em.event_id,
        em.uploader_id,
        em.status,
        em.created_at,
        em.url,
        em.caption,
        e.title AS event_title,
        u.name AS uploader_name
      FROM event_media em
      LEFT JOIN events e ON e.id = em.event_id
      LEFT JOIN users u ON u.id = em.uploader_id
      WHERE em.status = 'PENDING'
      ORDER BY em.created_at ASC
    `
  );
  return result.rows.map(mapMedia);
}

async function fetchOverviewMetrics() {
  const [
    userCounts,
    volunteerCounts,
    eventStats,
    sponsorStats,
    mediaStats,
    sponsorshipImpact,
    eventModeration,
    mediaModeration,
  ] = await Promise.all([
    pool.query(
      `
        SELECT
          COUNT(*)::INT AS total,
          COUNT(*) FILTER (WHERE is_active) ::INT AS active,
          COUNT(*) FILTER (WHERE NOT is_active) ::INT AS inactive
        FROM users
      `
    ),
    pool.query(
      `
        SELECT
          COUNT(DISTINCT ur.user_id)::INT AS volunteer_total,
          COUNT(DISTINCT es.user_id)::INT AS volunteer_engaged
        FROM user_roles ur
        LEFT JOIN event_signups es ON es.user_id = ur.user_id
        WHERE ur.role = 'VOLUNTEER'
      `
    ),
    pool.query(
      `
        SELECT
          COUNT(*)::INT AS total,
          COUNT(*) FILTER (WHERE approval_status = 'PENDING')::INT AS pending,
          COUNT(*) FILTER (WHERE approval_status = 'APPROVED' AND status = 'PUBLISHED')::INT AS published,
          AVG(
            CASE
              WHEN approved_at IS NOT NULL AND submitted_at IS NOT NULL
              THEN EXTRACT(EPOCH FROM (approved_at - submitted_at)) / 3600.0
              ELSE NULL
            END
          ) AS avg_turnaround_hours
        FROM events
      `
    ),
    pool.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'PENDING')::INT AS pending_profiles,
          COUNT(*) FILTER (WHERE status = 'APPROVED')::INT AS approved_profiles,
          COUNT(*) FILTER (WHERE status = 'APPROVED')::INT AS active_partners,
          COUNT(*) FILTER (WHERE status = 'APPROVED')::INT AS approved_sponsors
        FROM sponsor_profiles
      `
    ),
    pool.query(
      `
        SELECT
          COUNT(*)::INT AS total,
          COUNT(*) FILTER (WHERE status = 'PENDING')::INT AS pending,
          COUNT(*) FILTER (WHERE status = 'APPROVED')::INT AS approved,
          COUNT(*) FILTER (WHERE status = 'REJECTED')::INT AS rejected
        FROM event_media
      `
    ),
    pool.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'APPROVED')::INT AS approved_sponsorships,
          SUM(CASE WHEN status = 'APPROVED' AND amount IS NOT NULL THEN amount ELSE 0 END) AS approved_amount
        FROM sponsorships
      `
    ),
    pool.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE approval_status = 'APPROVED' AND approved_at >= NOW() - INTERVAL '30 days')::INT AS events_approved_30,
          COUNT(*) FILTER (WHERE approval_status = 'REJECTED' AND updated_at >= NOW() - INTERVAL '30 days')::INT AS events_rejected_30
        FROM events
      `
    ),
    pool.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE status <> 'PENDING' AND updated_at >= NOW() - INTERVAL '30 days')::INT AS media_moderated_30
        FROM event_media
      `
    ),
  ]);

  const users = userCounts.rows[0] || { total: 0, active: 0, inactive: 0 };
  const volunteers = volunteerCounts.rows[0] || { volunteer_total: 0, volunteer_engaged: 0 };
  const events = eventStats.rows[0] || { total: 0, pending: 0, published: 0, avg_turnaround_hours: null };
  const sponsors = sponsorStats.rows[0] || { pending_profiles: 0, approved_profiles: 0, active_partners: 0 };
  const media = mediaStats.rows[0] || { total: 0, pending: 0, approved: 0, rejected: 0 };
  const sponsorships = sponsorshipImpact.rows[0] || { approved_sponsorships: 0, approved_amount: 0 };
  const eventMod = eventModeration.rows[0] || {
    events_approved_30: 0,
    events_rejected_30: 0,
  };
  const mediaMod = mediaModeration.rows[0] || {
    media_moderated_30: 0,
  };

  const moderatedMedia = Number(media.approved || 0) + Number(media.rejected || 0);
  const rejectedRate = moderatedMedia ? Number(media.rejected || 0) / moderatedMedia : 0;

  return {
    users: {
      total: Number(users.total || 0),
      active: Number(users.active || 0),
      inactive: Number(users.inactive || 0),
    },
    volunteers: {
      total: Number(volunteers.volunteer_total || 0),
      engaged: Number(volunteers.volunteer_engaged || 0),
    },
    events: {
      total: Number(events.total || 0),
      pendingApproval: Number(events.pending || 0),
      published: Number(events.published || 0),
      approvalTurnaroundHours: events.avg_turnaround_hours ? Number(events.avg_turnaround_hours) : null,
    },
    sponsors: {
      pendingApplications: Number(sponsors.pending_profiles || 0),
      approved: Number(sponsors.approved_profiles || 0),
      approvedSponsorships: Number(sponsorships.approved_sponsorships || 0),
      approvedAmount: sponsorships.approved_amount ? Number(sponsorships.approved_amount) : 0,
    },
    media: {
      total: Number(media.total || 0),
      pending: Number(media.pending || 0),
      approved: Number(media.approved || 0),
      rejected: Number(media.rejected || 0),
      rejectedRate,
    },
    moderation: {
      eventsApproved30: Number(eventMod.events_approved_30 || 0),
      eventsRejected30: Number(eventMod.events_rejected_30 || 0),
      mediaModerated30: Number(mediaMod.media_moderated_30 || 0),
    },
  };
}

async function fetchExportRows(entity) {
  switch (entity) {
    case 'users': {
      const result = await pool.query(
        `
          SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            u.is_active,
            u.created_at,
            u.updated_at,
            u.deactivated_at,
            ARRAY(
              SELECT role
              FROM user_roles ur
              WHERE ur.user_id = u.id
              ORDER BY role ASC
            ) AS roles
          FROM users u
          ORDER BY u.created_at DESC
        `
      );
      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        roles: Array.isArray(row.roles) ? row.roles : [],
        isActive: row.is_active,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        deactivatedAt: toIso(row.deactivated_at),
      }));
    }
    case 'events': {
      const result = await pool.query(
        `
          SELECT
            id,
            title,
            status,
            approval_status,
            approval_reason,
            date_start,
            date_end,
            submitted_at,
            approved_at,
            published_at,
            created_at,
            updated_at
          FROM events
          ORDER BY created_at DESC
        `
      );
      return result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        approvalStatus: row.approval_status,
        approvalReason: row.approval_reason || null,
        dateStart: toIso(row.date_start),
        dateEnd: toIso(row.date_end),
        submittedAt: toIso(row.submitted_at),
        approvedAt: toIso(row.approved_at),
        publishedAt: toIso(row.published_at),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      }));
    }
    case 'sponsorships': {
      const result = await pool.query(
        `
          SELECT
            s.id,
            s.sponsor_id,
            s.event_id,
            s.type,
            s.amount,
            s.status,
            s.approved_at,
            s.pledged_at,
            s.created_at,
            s.updated_at
          FROM sponsorships s
          ORDER BY s.created_at DESC
        `
      );
      return result.rows.map((row) => ({
        id: row.id,
        sponsorId: row.sponsor_id,
        eventId: row.event_id,
        type: row.type,
        amount: row.amount === null ? null : Number(row.amount),
        status: row.status,
        approvedAt: toIso(row.approved_at),
        pledgedAt: toIso(row.pledged_at),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
      }));
    }
    case 'media': {
      const result = await pool.query(
        `
          SELECT
            em.id,
            em.event_id,
            em.uploader_id,
            em.status,
            em.created_at,
            em.updated_at,
            em.approved_at,
            em.approved_by
          FROM event_media em
          ORDER BY em.created_at DESC
        `
      );
      return result.rows.map((row) => ({
        id: row.id,
        eventId: row.event_id,
        uploaderId: row.uploader_id,
        status: row.status,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        approvedAt: toIso(row.approved_at),
        approvedBy: row.approved_by || null,
      }));
    }
    default:
      throw Object.assign(new Error('Unsupported export entity'), { statusCode: 400 });
  }
}

module.exports = {
  listPendingEvents,
  listPendingSponsorApplications,
  listPendingMedia,
  fetchOverviewMetrics,
  fetchExportRows,
};
