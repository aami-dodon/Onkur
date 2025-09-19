const pool = require('../common/db');

async function getOverviewMetrics() {
  const [roleCountsResult, userCountsResult, eventStatsResult, volunteerTotalsResult, volunteerActiveResult, sponsorProfilesResult, sponsorFundsResult, galleryStatsResult, auditRecentResult] = await Promise.all([
    pool.query(`SELECT role, COUNT(*)::INT AS count FROM user_roles GROUP BY role`),
    pool.query(`
      SELECT
        COUNT(*)::INT AS total_count,
        COUNT(*) FILTER (WHERE is_active) ::INT AS active_count,
        COUNT(*) FILTER (WHERE NOT is_active) ::INT AS inactive_count
      FROM users
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PUBLISHED') ::INT AS published_count,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') ::INT AS completed_count,
        COUNT(*) FILTER (WHERE approval_status = 'PENDING') ::INT AS pending_count,
        COUNT(*) FILTER (WHERE status = 'PUBLISHED' AND date_start >= NOW()) ::INT AS upcoming_count
      FROM events
    `),
    pool.query(`SELECT COALESCE(SUM(minutes), 0)::BIGINT AS total_minutes FROM volunteer_hours`),
    pool.query(`
      SELECT COUNT(DISTINCT user_id)::INT AS active_volunteers
      FROM event_attendance
      WHERE check_in_at >= NOW() - INTERVAL '30 days'
    `),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'APPROVED') ::INT AS approved_count,
        COUNT(*) FILTER (WHERE status = 'PENDING') ::INT AS pending_count,
        COUNT(*) FILTER (WHERE status = 'DECLINED') ::INT AS declined_count
      FROM sponsor_profiles
    `),
    pool.query(`SELECT COALESCE(SUM(amount), 0)::NUMERIC AS total_amount FROM sponsorships WHERE status = 'APPROVED'`),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING') ::INT AS pending_count,
        COUNT(*) FILTER (WHERE status = 'APPROVED') ::INT AS approved_count
      FROM event_media
    `),
    pool.query(`SELECT COUNT(*)::INT AS recent_actions FROM audit_logs WHERE created_at >= NOW() - INTERVAL '7 days'`),
  ]);

  const roleCounts = roleCountsResult.rows.reduce((acc, row) => {
    acc[row.role] = Number(row.count || 0);
    return acc;
  }, {});

  const userCounts = userCountsResult.rows[0] || {};
  const eventStats = eventStatsResult.rows[0] || {};
  const volunteerTotals = volunteerTotalsResult.rows[0] || {};
  const volunteerActive = volunteerActiveResult.rows[0] || {};
  const sponsorProfiles = sponsorProfilesResult.rows[0] || {};
  const sponsorFunds = sponsorFundsResult.rows[0] || {};
  const galleryStats = galleryStatsResult.rows[0] || {};
  const auditRecent = auditRecentResult.rows[0] || {};

  return {
    roleCounts,
    users: {
      total: Number(userCounts.total_count || 0),
      active: Number(userCounts.active_count || 0),
      inactive: Number(userCounts.inactive_count || 0),
    },
    events: {
      published: Number(eventStats.published_count || 0),
      completed: Number(eventStats.completed_count || 0),
      pendingApproval: Number(eventStats.pending_count || 0),
      upcoming: Number(eventStats.upcoming_count || 0),
    },
    volunteers: {
      totalMinutes: Number(volunteerTotals.total_minutes || 0),
      activeLast30Days: Number(volunteerActive.active_volunteers || 0),
    },
    sponsors: {
      approved: Number(sponsorProfiles.approved_count || 0),
      pending: Number(sponsorProfiles.pending_count || 0),
      declined: Number(sponsorProfiles.declined_count || 0),
      approvedFunds: Number(sponsorFunds.total_amount || 0),
    },
    gallery: {
      pending: Number(galleryStats.pending_count || 0),
      approved: Number(galleryStats.approved_count || 0),
    },
    audits: {
      actionsLast7Days: Number(auditRecent.recent_actions || 0),
    },
  };
}

async function getUsersForExport() {
  const result = await pool.query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.is_active,
      u.created_at,
      u.email_verified_at,
      ARRAY_REMOVE(ARRAY_AGG(ur.role), NULL) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  return result.rows;
}

async function getEventsForExport() {
  const result = await pool.query(`
    SELECT
      e.id,
      e.title,
      e.status,
      e.approval_status,
      e.date_start,
      e.date_end,
      e.created_at,
      e.published_at,
      e.created_by,
      e.category,
      e.location
    FROM events e
    ORDER BY e.created_at DESC
  `);
  return result.rows;
}

async function getSponsorshipsForExport() {
  const result = await pool.query(`
    SELECT
      s.id,
      s.sponsor_id,
      s.event_id,
      s.type,
      s.amount,
      s.status,
      s.approved_at,
      s.pledged_at
    FROM sponsorships s
    ORDER BY s.pledged_at DESC
  `);
  return result.rows;
}

async function getMediaForExport() {
  const result = await pool.query(`
    SELECT
      m.id,
      m.event_id,
      m.uploader_id,
      m.status,
      m.created_at,
      m.approved_at,
      m.rejection_reason
    FROM event_media m
    ORDER BY m.created_at DESC
  `);
  return result.rows;
}

module.exports = {
  getOverviewMetrics,
  getUsersForExport,
  getEventsForExport,
  getSponsorshipsForExport,
  getMediaForExport,
};
