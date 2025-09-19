const ExcelJS = require('exceljs');
const logger = require('../../utils/logger');
const {
  listPendingEvents,
  listPendingSponsorApplications,
  listPendingMedia,
  fetchOverviewMetrics,
  fetchExportRows,
} = require('./admin.repository');
const {
  findEventById,
  updateEventApprovalStatus,
  getUserContact,
} = require('../event-management/eventManagement.repository');
const { updateSponsorApproval } = require('../sponsors/sponsor.service');
const { findSponsorProfile } = require('../sponsors/sponsor.repository');
const { moderateMedia } = require('../event-gallery/eventGallery.service');
const { findMediaById } = require('../event-gallery/eventGallery.repository');
const { recordAuditLog } = require('../auth/auth.repository');
const { assignRole, updateUserActivation } = require('../auth/auth.service');
const { sendTemplatedEmail } = require('../email/email.service');

function summarizeLocation(event) {
  if (!event) {
    return 'Location to be announced';
  }
  if (event.isOnline) {
    return event.location || 'Online event';
  }
  const parts = [];
  if (event.location) {
    parts.push(event.location);
  }
  if (event.cityName && !parts.includes(event.cityName)) {
    parts.push(event.cityName);
  }
  if (event.stateName && !parts.includes(event.stateName)) {
    parts.push(event.stateName);
  }
  return parts.length ? parts.join(', ') : 'Location to be announced';
}

function formatModerationResult({ events, sponsors, media }) {
  const payload = {};
  if (events) {
    payload.events = events;
  }
  if (sponsors) {
    payload.sponsors = sponsors;
  }
  if (media) {
    payload.media = media;
  }
  return payload;
}

function normaliseEntityType(entityType) {
  if (!entityType) {
    return null;
  }
  const value = String(entityType).trim().toLowerCase();
  if (['event', 'events'].includes(value)) return 'events';
  if (['sponsor', 'sponsors', 'sponsor_profile'].includes(value)) return 'sponsors';
  if (['media', 'gallery', 'galleries'].includes(value)) return 'media';
  return null;
}

async function getModerationQueue({ type } = {}) {
  const normalized = normaliseEntityType(type);
  if (normalized === 'events') {
    const events = await listPendingEvents();
    return formatModerationResult({ events });
  }
  if (normalized === 'sponsors') {
    const sponsors = await listPendingSponsorApplications();
    return formatModerationResult({ sponsors });
  }
  if (normalized === 'media') {
    const media = await listPendingMedia();
    return formatModerationResult({ media });
  }
  const [events, sponsors, media] = await Promise.all([
    listPendingEvents(),
    listPendingSponsorApplications(),
    listPendingMedia(),
  ]);
  return formatModerationResult({ events, sponsors, media });
}

async function notifyEventManager(event, { approved, reason = null }) {
  if (!event?.createdBy) {
    return;
  }
  try {
    const contact = await getUserContact(event.createdBy);
    if (!contact?.email) {
      return;
    }
    const heading = approved ? 'Event approved 🎉' : 'Event needs attention';
    const subject = approved
      ? `Your event "${event.title}" is live`
      : `Updates requested for "${event.title}"`;
    const bodyLines = approved
      ? [
          `Hi ${contact.name?.split(' ')[0] || 'there'},`,
          `Your event <strong>${event.title}</strong> has been approved by the admin team and is now visible to volunteers.`,
          `Schedule: ${event.dateStart || 'TBA'} → ${event.dateEnd || 'TBA'}`,
          `Location: ${summarizeLocation(event)}`,
        ]
      : [
          `Hi ${contact.name?.split(' ')[0] || 'there'},`,
          `Your event <strong>${event.title}</strong> was reviewed by the admin team and needs a quick follow-up before it can go live.`,
          reason ? `Reason: ${reason}` : 'Please review the submission details and resubmit when ready.',
        ];
    await sendTemplatedEmail({
      to: contact.email,
      subject,
      heading,
      bodyLines,
    });
  } catch (error) {
    logger.warn('Failed to notify event manager about approval outcome', {
      eventId: event?.id,
      error: error.message,
    });
  }
}

async function approveEvent({ actorId, eventId }) {
  const before = await findEventById(eventId);
  if (!before) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }
  const updated = await updateEventApprovalStatus({ eventId, status: 'APPROVED', actorId });
  await recordAuditLog({
    actorId,
    action: 'admin.event.approve',
    entityType: 'event',
    entityId: eventId,
    before: { approvalStatus: before.approval_status, status: before.status },
    after: { approvalStatus: updated.approvalStatus, status: updated.status },
  });
  await notifyEventManager(updated, { approved: true });
  return updated;
}

async function rejectEvent({ actorId, eventId, reason = null }) {
  const before = await findEventById(eventId);
  if (!before) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }
  const updated = await updateEventApprovalStatus({ eventId, status: 'REJECTED', actorId, reason });
  await recordAuditLog({
    actorId,
    action: 'admin.event.reject',
    entityType: 'event',
    entityId: eventId,
    before: { approvalStatus: before.approval_status, status: before.status },
    after: { approvalStatus: updated.approvalStatus, status: updated.status, reason },
    metadata: reason ? { reason } : {},
  });
  await notifyEventManager(updated, { approved: false, reason });
  return updated;
}

async function approveSponsor({ actorId, sponsorId }) {
  const before = await findSponsorProfile(sponsorId);
  if (!before) {
    const error = new Error('Sponsor profile not found');
    error.statusCode = 404;
    throw error;
  }
  const updated = await updateSponsorApproval({ sponsorId, status: 'APPROVED' });
  await recordAuditLog({
    actorId,
    action: 'admin.sponsor.approve',
    entityType: 'sponsor_profile',
    entityId: sponsorId,
    before: { status: before.status },
    after: { status: updated.status },
  });
  return updated;
}

async function rejectSponsor({ actorId, sponsorId, reason = null }) {
  const before = await findSponsorProfile(sponsorId);
  if (!before) {
    const error = new Error('Sponsor profile not found');
    error.statusCode = 404;
    throw error;
  }
  const updated = await updateSponsorApproval({ sponsorId, status: 'DECLINED' });
  await recordAuditLog({
    actorId,
    action: 'admin.sponsor.reject',
    entityType: 'sponsor_profile',
    entityId: sponsorId,
    before: { status: before.status },
    after: { status: updated.status },
    metadata: reason ? { reason } : {},
  });
  return updated;
}

async function approveMedia({ actorId, mediaId }) {
  const before = await findMediaById(mediaId);
  if (!before) {
    const error = new Error('Media not found');
    error.statusCode = 404;
    throw error;
  }
  const updated = await moderateMedia({ mediaId, action: 'approve', moderatorId: actorId });
  await recordAuditLog({
    actorId,
    action: 'admin.media.approve',
    entityType: 'event_media',
    entityId: mediaId,
    before: { status: before.status },
    after: { status: updated.status },
  });
  return updated;
}

async function rejectMedia({ actorId, mediaId, reason = null }) {
  const before = await findMediaById(mediaId);
  if (!before) {
    const error = new Error('Media not found');
    error.statusCode = 404;
    throw error;
  }
  const updated = await moderateMedia({ mediaId, action: 'reject', moderatorId: actorId, reason });
  await recordAuditLog({
    actorId,
    action: 'admin.media.reject',
    entityType: 'event_media',
    entityId: mediaId,
    before: { status: before.status },
    after: { status: updated.status },
    metadata: reason ? { reason } : {},
  });
  return updated;
}

async function approveEntity({ actorId, entityType, entityId }) {
  const normalized = normaliseEntityType(entityType);
  if (normalized === 'events') {
    return approveEvent({ actorId, eventId: entityId });
  }
  if (normalized === 'sponsors') {
    return approveSponsor({ actorId, sponsorId: entityId });
  }
  if (normalized === 'media') {
    return approveMedia({ actorId, mediaId: entityId });
  }
  const error = new Error('Unsupported entity type');
  error.statusCode = 400;
  throw error;
}

async function rejectEntity({ actorId, entityType, entityId, reason = null }) {
  const normalized = normaliseEntityType(entityType);
  if (normalized === 'events') {
    return rejectEvent({ actorId, eventId: entityId, reason });
  }
  if (normalized === 'sponsors') {
    return rejectSponsor({ actorId, sponsorId: entityId, reason });
  }
  if (normalized === 'media') {
    return rejectMedia({ actorId, mediaId: entityId, reason });
  }
  const error = new Error('Unsupported entity type');
  error.statusCode = 400;
  throw error;
}

async function getOverviewReport() {
  return fetchOverviewMetrics();
}

function toCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeCsv(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return '';
  }
  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const stringValue = toCsvValue(value);
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    const line = headers.map((header) => escape(row[header])).join(',');
    lines.push(line);
  }
  return lines.join('\n');
}

async function encodeExcel(rows, sheetName = 'Export') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  if (!Array.isArray(rows) || !rows.length) {
    sheet.addRow(['No data available']);
    return workbook.xlsx.writeBuffer();
  }
  const headers = Object.keys(rows[0]);
  sheet.columns = headers.map((header) => ({ header, key: header }));
  rows.forEach((row) => {
    const normalized = {};
    for (const key of headers) {
      const value = row[key];
      if (Array.isArray(value) || (value && typeof value === 'object')) {
        normalized[key] = JSON.stringify(value);
      } else {
        normalized[key] = value;
      }
    }
    sheet.addRow(normalized);
  });
  sheet.getRow(1).font = { bold: true };
  return workbook.xlsx.writeBuffer();
}

async function exportEntities({ entity, format = 'csv' }) {
  const rows = await fetchExportRows(entity);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (String(format).toLowerCase() === 'xlsx' || String(format).toLowerCase() === 'excel') {
    const buffer = await encodeExcel(rows, `${entity}-export`);
    return {
      filename: `${entity}-export-${timestamp}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    };
  }
  const csv = encodeCsv(rows);
  return {
    filename: `${entity}-export-${timestamp}.csv`,
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  };
}

async function updateUserAccount({ actorId, userId, roles = null, isActive, reason = null }) {
  const updates = [];
  let latest = null;
  if (Array.isArray(roles) && roles.length) {
    latest = await assignRole({ actorId, userId, roles });
    updates.push('roles');
  }
  if (typeof isActive === 'boolean') {
    latest = await updateUserActivation({ actorId, userId, isActive, reason });
    updates.push('status');
  }
  if (!updates.length) {
    const error = new Error('No valid updates supplied');
    error.statusCode = 400;
    throw error;
  }
  return latest;
}

module.exports = {
  getModerationQueue,
  approveEntity,
  rejectEntity,
  getOverviewReport,
  exportEntities,
  updateUserAccount,
};
