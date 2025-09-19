const logger = require('../../utils/logger');
const {
  getOverviewMetrics,
  getUsersForExport,
  getEventsForExport,
  getSponsorshipsForExport,
  getMediaForExport,
} = require('./admin.repository');
const {
  listEventsPendingApproval,
  setEventApprovalStatus,
  findEventById,
} = require('../event-management/eventManagement.repository');
const {
  recordAuditLog,
  findUserById,
  setUserActiveStatus,
  replaceUserRoles,
} = require('../auth/auth.repository');
const { sortRolesByPriority } = require('../auth/role.helpers');
const { ROLES } = require('../auth/constants');
const { updateSponsorApproval } = require('../sponsors/sponsor.service');
const { findSponsorProfile, listSponsorProfiles } = require('../sponsors/sponsor.repository');
const { listPendingMedia, findMediaById } = require('../event-gallery/eventGallery.repository');
const { moderateMedia } = require('../event-gallery/eventGallery.service');
const { sendTemplatedEmail } = require('../email/email.service');

function toIso(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sanitizeRolesInput(roles) {
  if (!roles) {
    return [];
  }
  const source = Array.isArray(roles) ? roles : [roles];
  const normalized = source
    .map((role) => (typeof role === 'string' ? role.trim().toUpperCase() : ''))
    .filter((role) => ROLES.includes(role));
  return sortRolesByPriority(normalized);
}

function describeEventLocation(event) {
  if (!event) {
    return 'TBD';
  }
  if (event.isOnline) {
    return event.location || 'Online';
  }
  const parts = [event.location, event.cityName, event.stateName].filter(Boolean);
  return parts.length ? parts.join(', ') : 'TBD';
}

function toAuditUser(user) {
  if (!user) {
    return null;
  }
  const roles =
    Array.isArray(user.roles) && user.roles.length ? sortRolesByPriority(user.roles) : [];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || null,
    roles,
    isActive: user.is_active !== false,
    emailVerified: Boolean(user.email_verified_at),
  };
}

function toAuditEvent(event) {
  if (!event) {
    return null;
  }
  return {
    id: event.id,
    title: event.title,
    status: event.status,
    approvalStatus: event.approvalStatus || event.approval_status || 'PENDING',
    approvalNote: event.approvalNote || event.approval_note || null,
    dateStart: toIso(event.dateStart || event.date_start),
    dateEnd: toIso(event.dateEnd || event.date_end),
    createdBy: event.createdBy || event.created_by || null,
  };
}

function toAuditSponsor(profile) {
  if (!profile) {
    return null;
  }
  return {
    userId: profile.userId || profile.user_id,
    orgName: profile.orgName || profile.org_name,
    status: profile.status,
    approvedAt: toIso(profile.approvedAt || profile.approved_at),
  };
}

function toAuditMedia(media) {
  if (!media) {
    return null;
  }
  return {
    id: media.id,
    eventId: media.eventId || media.event_id,
    uploaderId: media.uploaderId || media.uploader_id,
    status: media.status,
  };
}

function mapEventSummary(event) {
  if (!event) {
    return null;
  }
  return {
    id: event.id,
    title: event.title,
    status: event.status,
    approvalStatus: event.approvalStatus || event.approval_status || 'PENDING',
    approvalNote: event.approvalNote || event.approval_note || null,
    createdBy: event.createdBy || event.created_by || null,
    createdByName: event.createdByName || event.creator_name || null,
    createdByEmail: event.createdByEmail || event.creator_email || null,
    createdAt: toIso(event.createdAt || event.created_at),
    dateStart: toIso(event.dateStart || event.date_start),
    dateEnd: toIso(event.dateEnd || event.date_end),
    category: event.category || null,
    location: event.location || null,
  };
}

function mapSponsorSummary(profile) {
  if (!profile) {
    return null;
  }
  return {
    userId: profile.userId,
    orgName: profile.orgName,
    contactName: profile.contactName,
    contactEmail: profile.contactEmail,
    status: profile.status,
    appliedAt: toIso(profile.createdAt || profile.created_at),
  };
}

function mapMediaSummary(media, eventLookup = new Map()) {
  if (!media) {
    return null;
  }
  const event = eventLookup.get(media.eventId);
  return {
    id: media.id,
    eventId: media.eventId,
    uploaderId: media.uploaderId,
    caption: media.caption,
    status: media.status,
    submittedAt: toIso(media.createdAt || media.created_at),
    eventTitle: event ? event.title : null,
  };
}

function mapUserSummary(user) {
  if (!user) {
    return null;
  }
  const roles =
    Array.isArray(user.roles) && user.roles.length ? sortRolesByPriority(user.roles) : [];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || (roles.length ? roles[0] : null),
    roles,
    isActive: user.is_active !== false,
    createdAt: toIso(user.created_at || user.createdAt),
    emailVerifiedAt: toIso(user.email_verified_at || user.emailVerifiedAt),
  };
}

function formatCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const stringValue = typeof value === 'string' ? value : String(value);
  const needsEscaping = /[",\n]/.test(stringValue);
  const escaped = stringValue.replace(/"/g, '""');
  return needsEscaping ? `"${escaped}"` : escaped;
}

function extractColumnValue(column, row) {
  return typeof column.accessor === 'function' ? column.accessor(row) : row[column.key];
}

function buildCsv(columns, rows) {
  const header = columns.map((column) => column.header).join(',');
  const dataLines = rows.map((row) =>
    columns.map((column) => formatCsvValue(extractColumnValue(column, row))).join(',')
  );
  return [header, ...dataLines].join('\n');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildExcelXml(columns, rows, sheetName = 'Export') {
  const headerRow = columns
    .map((column) => `<Cell><Data ss:Type="String">${escapeXml(column.header)}</Data></Cell>`)
    .join('');

  const dataRows = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const raw = extractColumnValue(column, row);
          if (raw === null || raw === undefined || raw === '') {
            return '<Cell/>';
          }
          if (typeof raw === 'number' && Number.isFinite(raw)) {
            return `<Cell><Data ss:Type="Number">${raw}</Data></Cell>`;
          }
          return `<Cell><Data ss:Type="String">${escapeXml(raw)}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  return (
    `<?xml version="1.0"?>` +
    `<?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Worksheet ss:Name="${escapeXml(sheetName)}">` +
    `<Table>` +
    `<Row>${headerRow}</Row>` +
    dataRows +
    `</Table>` +
    `</Worksheet>` +
    `</Workbook>`
  );
}

async function getModerationQueue({ type }) {
  const normalized = typeof type === 'string' ? type.trim().toLowerCase() : '';
  if (normalized === 'events') {
    const events = await listEventsPendingApproval();
    return {
      type: 'events',
      count: events.length,
      items: events.map(mapEventSummary),
    };
  }
  if (normalized === 'sponsors') {
    const sponsors = await listSponsorProfiles({ statuses: ['PENDING'] });
    return {
      type: 'sponsors',
      count: sponsors.length,
      items: sponsors.map(mapSponsorSummary),
    };
  }
  if (normalized === 'media') {
    const queue = await listPendingMedia({ page: 1, pageSize: 50 });
    const uniqueEventIds = Array.from(new Set(queue.media.map((item) => item.eventId))).filter(
      Boolean
    );
    const events = await Promise.all(
      uniqueEventIds.map((eventId) => findEventById(eventId).catch(() => null))
    );
    const eventLookup = new Map(events.filter(Boolean).map((event) => [event.id, event]));
    return {
      type: 'media',
      count: queue.total,
      items: queue.media.map((item) => mapMediaSummary(item, eventLookup)),
    };
  }
  throw Object.assign(new Error('Unsupported moderation type'), { statusCode: 400 });
}

async function approveEvent({ eventId, actorId, note }) {
  const before = await findEventById(eventId);
  if (!before) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }
  const updated = await setEventApprovalStatus(eventId, {
    status: 'APPROVED',
    note,
    moderatorId: actorId,
  });

  await recordAuditLog({
    actorId,
    action: 'admin.event.approve',
    entityType: 'event',
    entityId: updated.id,
    before: toAuditEvent(before),
    after: toAuditEvent(updated),
  });

  if (updated.createdBy) {
    try {
      const creator = await findUserById(updated.createdBy);
      if (creator?.email) {
        await sendTemplatedEmail({
          to: creator.email,
          subject: 'Your event is approved and live',
          heading: 'Your event is live! 🌿',
          bodyLines: [
            `Hi ${creator.name?.split(' ')[0] || 'there'},`,
            `We reviewed and approved <strong>${updated.title}</strong>. It's now visible to volunteers.`,
            `Start: ${toIso(updated.dateStart || updated.date_start) || 'TBD'} · Location: ${describeEventLocation(updated)}`,
          ],
          previewText: 'Your event is ready for volunteers',
        });
      }
    } catch (error) {
      logger.warn('Failed to send event approval email', { eventId, error: error.message });
    }
  }

  return mapEventSummary(updated);
}

async function rejectEvent({ eventId, actorId, note }) {
  const before = await findEventById(eventId);
  if (!before) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }
  const updated = await setEventApprovalStatus(eventId, {
    status: 'REJECTED',
    note,
    moderatorId: actorId,
  });

  await recordAuditLog({
    actorId,
    action: 'admin.event.reject',
    entityType: 'event',
    entityId: updated.id,
    before: toAuditEvent(before),
    after: toAuditEvent(updated),
  });

  if (updated.createdBy) {
    try {
      const creator = await findUserById(updated.createdBy);
      if (creator?.email) {
        await sendTemplatedEmail({
          to: creator.email,
          subject: 'Event submission update',
          heading: 'We need a quick update',
          bodyLines: [
            `Hi ${creator.name?.split(' ')[0] || 'there'},`,
            `We reviewed <strong>${updated.title}</strong> and need a few tweaks before it can go live.`,
            note
              ? `Moderator note: ${note}`
              : 'Reply to this email for guidance or resubmit when you are ready.',
          ],
          previewText: 'Your event needs updates before publishing',
        });
      }
    } catch (error) {
      logger.warn('Failed to send event rejection email', { eventId, error: error.message });
    }
  }

  return mapEventSummary(updated);
}

async function approveSponsor({ sponsorId, actorId }) {
  const before = await findSponsorProfile(sponsorId);
  if (!before) {
    throw Object.assign(new Error('Sponsor profile not found'), { statusCode: 404 });
  }
  const updated = await updateSponsorApproval({ sponsorId, status: 'APPROVED' });
  await recordAuditLog({
    actorId,
    action: 'admin.sponsor.approve',
    entityType: 'sponsor_profile',
    entityId: sponsorId,
    before: toAuditSponsor(before),
    after: toAuditSponsor(updated),
  });
  return mapSponsorSummary(updated);
}

async function rejectSponsor({ sponsorId, actorId }) {
  const before = await findSponsorProfile(sponsorId);
  if (!before) {
    throw Object.assign(new Error('Sponsor profile not found'), { statusCode: 404 });
  }
  const updated = await updateSponsorApproval({ sponsorId, status: 'DECLINED' });
  await recordAuditLog({
    actorId,
    action: 'admin.sponsor.reject',
    entityType: 'sponsor_profile',
    entityId: sponsorId,
    before: toAuditSponsor(before),
    after: toAuditSponsor(updated),
  });
  return mapSponsorSummary(updated);
}

async function approveMedia({ mediaId, actorId }) {
  const before = await findMediaById(mediaId);
  if (!before) {
    throw Object.assign(new Error('Media not found'), { statusCode: 404 });
  }
  const updated = await moderateMedia({ mediaId, action: 'approve', moderatorId: actorId });
  await recordAuditLog({
    actorId,
    action: 'admin.media.approve',
    entityType: 'event_media',
    entityId: mediaId,
    before: toAuditMedia(before),
    after: toAuditMedia(updated),
  });
  return updated;
}

async function rejectMedia({ mediaId, actorId, reason }) {
  const before = await findMediaById(mediaId);
  if (!before) {
    throw Object.assign(new Error('Media not found'), { statusCode: 404 });
  }
  const updated = await moderateMedia({ mediaId, action: 'reject', moderatorId: actorId, reason });
  await recordAuditLog({
    actorId,
    action: 'admin.media.reject',
    entityType: 'event_media',
    entityId: mediaId,
    before: toAuditMedia(before),
    after: toAuditMedia(updated),
  });
  return updated;
}

async function approveEntity({ entityType, entityId, actorId, note }) {
  const normalized = typeof entityType === 'string' ? entityType.trim().toLowerCase() : '';
  if (normalized === 'events') {
    return approveEvent({ eventId: entityId, actorId, note });
  }
  if (normalized === 'sponsors') {
    return approveSponsor({ sponsorId: entityId, actorId });
  }
  if (normalized === 'media') {
    return approveMedia({ mediaId: entityId, actorId });
  }
  throw Object.assign(new Error('Unsupported entity type'), { statusCode: 400 });
}

async function rejectEntity({ entityType, entityId, actorId, note }) {
  const normalized = typeof entityType === 'string' ? entityType.trim().toLowerCase() : '';
  if (normalized === 'events') {
    return rejectEvent({ eventId: entityId, actorId, note });
  }
  if (normalized === 'sponsors') {
    return rejectSponsor({ sponsorId: entityId, actorId });
  }
  if (normalized === 'media') {
    return rejectMedia({ mediaId: entityId, actorId, reason: note });
  }
  throw Object.assign(new Error('Unsupported entity type'), { statusCode: 400 });
}

async function updateUser({ userId, roles, isActive, actorId }) {
  const existing = await findUserById(userId);
  if (!existing) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  let current = existing;

  if (roles !== undefined) {
    const normalizedRoles = sanitizeRolesInput(roles);
    if (!normalizedRoles.length) {
      throw Object.assign(new Error('At least one valid role is required'), { statusCode: 400 });
    }
    const updatedRolesUser = await replaceUserRoles({ userId, roles: normalizedRoles });
    await recordAuditLog({
      actorId,
      action: 'admin.user.roles',
      entityType: 'user',
      entityId: userId,
      before: toAuditUser(current),
      after: toAuditUser(updatedRolesUser),
    });
    current = updatedRolesUser;
  }

  if (typeof isActive === 'boolean' && isActive !== (current.is_active !== false)) {
    const toggled = await setUserActiveStatus({ userId, isActive });
    await recordAuditLog({
      actorId,
      action: isActive ? 'admin.user.activate' : 'admin.user.deactivate',
      entityType: 'user',
      entityId: userId,
      before: toAuditUser(current),
      after: toAuditUser(toggled),
    });
    current = toggled;
  }

  return mapUserSummary(current);
}

async function getReportsOverview() {
  return getOverviewMetrics();
}

async function exportData({ entity, format }) {
  const normalized = typeof entity === 'string' ? entity.trim().toLowerCase() : '';
  const normalizedFormat = typeof format === 'string' ? format.trim().toLowerCase() : 'csv';

  function formatResponse({ columns, rows }) {
    if (normalizedFormat === 'excel' || normalizedFormat === 'xls' || normalizedFormat === 'xlsx') {
      return {
        content: buildExcelXml(columns, rows, `${normalized || 'export'}`.slice(0, 24) || 'Export'),
        contentType: 'application/vnd.ms-excel',
        extension: 'xls',
      };
    }
    if (normalizedFormat === 'csv' || normalizedFormat === '') {
      return {
        content: buildCsv(columns, rows),
        contentType: 'text/csv',
        extension: 'csv',
      };
    }
    throw Object.assign(new Error('Unsupported export format'), { statusCode: 400 });
  }

  if (normalized === 'users') {
    const rows = await getUsersForExport();
    const columns = [
      { key: 'id', header: 'User ID' },
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email' },
      {
        key: 'roles',
        header: 'Roles',
        accessor: (row) => (Array.isArray(row.roles) ? row.roles.join('; ') : ''),
      },
      { key: 'is_active', header: 'Active' },
      {
        key: 'email_verified_at',
        header: 'Email Verified At',
        accessor: (row) => toIso(row.email_verified_at),
      },
      { key: 'created_at', header: 'Created At', accessor: (row) => toIso(row.created_at) },
    ];
    return formatResponse({ columns, rows });
  }
  if (normalized === 'events') {
    const rows = await getEventsForExport();
    const columns = [
      { key: 'id', header: 'Event ID' },
      { key: 'title', header: 'Title' },
      { key: 'status', header: 'Status' },
      { key: 'approval_status', header: 'Approval Status' },
      { key: 'date_start', header: 'Start', accessor: (row) => toIso(row.date_start) },
      { key: 'date_end', header: 'End', accessor: (row) => toIso(row.date_end) },
      { key: 'created_at', header: 'Created At', accessor: (row) => toIso(row.created_at) },
      { key: 'published_at', header: 'Published At', accessor: (row) => toIso(row.published_at) },
      { key: 'created_by', header: 'Created By' },
      { key: 'category', header: 'Category' },
      { key: 'location', header: 'Location' },
    ];
    return formatResponse({ columns, rows });
  }
  if (normalized === 'sponsorships') {
    const rows = await getSponsorshipsForExport();
    const columns = [
      { key: 'id', header: 'Sponsorship ID' },
      { key: 'sponsor_id', header: 'Sponsor ID' },
      { key: 'event_id', header: 'Event ID' },
      { key: 'type', header: 'Type' },
      { key: 'amount', header: 'Amount' },
      { key: 'status', header: 'Status' },
      { key: 'approved_at', header: 'Approved At', accessor: (row) => toIso(row.approved_at) },
      { key: 'pledged_at', header: 'Pledged At', accessor: (row) => toIso(row.pledged_at) },
    ];
    return formatResponse({ columns, rows });
  }
  if (normalized === 'media') {
    const rows = await getMediaForExport();
    const columns = [
      { key: 'id', header: 'Media ID' },
      { key: 'event_id', header: 'Event ID' },
      { key: 'uploader_id', header: 'Uploader ID' },
      { key: 'status', header: 'Status' },
      { key: 'created_at', header: 'Created At', accessor: (row) => toIso(row.created_at) },
      { key: 'approved_at', header: 'Approved At', accessor: (row) => toIso(row.approved_at) },
      { key: 'rejection_reason', header: 'Rejection Reason' },
    ];
    return formatResponse({ columns, rows });
  }
  throw Object.assign(new Error('Unsupported export entity'), { statusCode: 400 });
}

module.exports = {
  getModerationQueue,
  approveEntity,
  rejectEntity,
  updateUser,
  getReportsOverview,
  exportData,
};
