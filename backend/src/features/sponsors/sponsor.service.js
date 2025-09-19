const logger = require('../../utils/logger');
const config = require('../../config');
const {
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
} = require('./sponsor.repository');
const { findUserById, replaceUserRoles } = require('../auth/auth.repository');
const {
  generateEventReport,
  findEventById,
} = require('../event-management/eventManagement.repository');
const { getGalleryMetrics } = require('../event-gallery/eventGallery.repository');
const { sendTemplatedEmail } = require('../email/email.service');

const APP_BASE_URL = config.app?.baseUrl || 'https://onkur.example.com';

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeString(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : null;
}

function sanitizeBrandAssets(payload) {
  if (!payload || typeof payload !== 'object') {
    return {};
  }
  const { guidelines, colors, files } = payload;
  const result = {};
  if (guidelines !== undefined && guidelines !== null) {
    const text = String(guidelines).trim();
    if (text.length) {
      result.guidelines = text;
    }
  }
  if (Array.isArray(colors)) {
    result.colors = colors
      .map((entry) => String(entry || '').trim())
      .filter((entry) => entry.length);
  }
  if (Array.isArray(files)) {
    result.files = files.map((entry) => String(entry || '').trim()).filter((entry) => entry.length);
  }
  return result;
}

function ensureSponsorRole(user) {
  const roles =
    Array.isArray(user.roles) && user.roles.length ? [...user.roles] : user.role ? [user.role] : [];
  if (!roles.includes('SPONSOR')) {
    roles.push('SPONSOR');
  }
  return roles;
}

async function applyForSponsor({
  userId,
  orgName,
  website,
  logoUrl,
  contactName,
  contactEmail,
  contactPhone,
  brandAssets,
}) {
  if (!userId) {
    throw createHttpError(401, 'Authentication required');
  }
  const normalizedOrgName = sanitizeString(orgName);
  if (!normalizedOrgName) {
    throw createHttpError(400, 'Organization name is required');
  }
  const user = await findUserById(userId);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  const profile = await applySponsorProfile({
    userId,
    orgName: normalizedOrgName,
    website: sanitizeString(website),
    logoUrl: sanitizeString(logoUrl),
    contactName: sanitizeString(contactName) || sanitizeString(user.name) || normalizedOrgName,
    contactEmail: sanitizeString(contactEmail) || user.email,
    contactPhone: sanitizeString(contactPhone),
    brandAssets: sanitizeBrandAssets(brandAssets),
  });

  const desiredRoles = ensureSponsorRole(user);
  if (
    desiredRoles.length !== (user.roles || []).length ||
    !desiredRoles.every((role, index) => role === (user.roles || [])[index])
  ) {
    try {
      await replaceUserRoles({ userId, roles: desiredRoles });
    } catch (error) {
      logger.warn('Failed to refresh roles while applying as sponsor', {
        userId,
        error: error.message,
      });
    }
  }

  logger.info('Sponsor application submitted', { userId, orgName: normalizedOrgName });
  return profile;
}

async function getSponsorProfile(userId) {
  if (!userId) {
    throw createHttpError(401, 'Authentication required');
  }
  const profile = await findSponsorProfile(userId);
  if (!profile) {
    throw createHttpError(404, 'Sponsor profile not found');
  }
  return profile;
}

async function updateProfile({ userId, updates }) {
  if (!userId) {
    throw createHttpError(401, 'Authentication required');
  }
  const profile = await findSponsorProfile(userId);
  if (!profile) {
    throw createHttpError(404, 'Sponsor profile not found');
  }
  const user = await findUserById(userId);
  const next = await updateSponsorProfile(userId, {
    orgName: updates.orgName !== undefined ? sanitizeString(updates.orgName) : undefined,
    website: updates.website !== undefined ? sanitizeString(updates.website) : undefined,
    logoUrl: updates.logoUrl !== undefined ? sanitizeString(updates.logoUrl) : undefined,
    contactName:
      updates.contactName !== undefined ? sanitizeString(updates.contactName) : undefined,
    contactEmail:
      updates.contactEmail !== undefined
        ? sanitizeString(updates.contactEmail) || user?.email
        : undefined,
    contactPhone:
      updates.contactPhone !== undefined ? sanitizeString(updates.contactPhone) : undefined,
    brandAssets:
      updates.brandAssets !== undefined ? sanitizeBrandAssets(updates.brandAssets) : undefined,
  });
  logger.info('Sponsor profile updated', { userId });
  return next;
}

async function listSponsorApplications({ statuses }) {
  return listSponsorProfiles({ statuses });
}

async function resolveSponsorContact(profile) {
  if (!profile) {
    return { email: null, name: null };
  }
  let user = null;
  try {
    user = await findUserById(profile.userId);
  } catch (error) {
    logger.warn('Failed to resolve sponsor user contact', {
      sponsorId: profile.userId,
      error: error.message,
    });
  }
  const email = sanitizeString(profile.contactEmail) || (user ? user.email : null);
  const name =
    sanitizeString(profile.contactName) ||
    (user ? sanitizeString(user.name) : null) ||
    profile.orgName ||
    'Sponsor';
  return { email, name };
}

async function updateSponsorApproval({ sponsorId, status }) {
  const profile = await setSponsorStatus({ userId: sponsorId, status });
  const contact = await resolveSponsorContact(profile);
  if (profile.status === 'APPROVED' && contact.email) {
    try {
      await sendTemplatedEmail({
        to: contact.email,
        subject: 'Your sponsorship workspace is live',
        heading: 'Welcome aboard! 🌿',
        bodyLines: [
          `Hi ${contact.name},`,
          'Your sponsor application has been approved. You can now pledge support to events and see your impact grow.',
        ],
        cta: {
          url: `${APP_BASE_URL}/app`,
          label: 'Open your dashboard',
        },
        previewText: 'Your sponsor access is unlocked',
      });
    } catch (error) {
      logger.warn('Failed to send sponsor approval email', { sponsorId, error: error.message });
    }
  } else if (profile.status === 'DECLINED' && contact.email) {
    try {
      await sendTemplatedEmail({
        to: contact.email,
        subject: 'Sponsor application update',
        heading: 'Thanks for applying',
        bodyLines: [
          `Hi ${contact.name},`,
          'Thank you for offering to sponsor Onkur experiences. At this time we are unable to approve the application.',
          'Reply to this email if you would like feedback or want to share updated information.',
        ],
        cta: null,
        previewText: 'Sponsor application update from Onkur',
      });
    } catch (error) {
      logger.warn('Failed to send sponsor decline email', { sponsorId, error: error.message });
    }
  }
  return profile;
}

function normalizeSponsorshipType(type) {
  if (!type) return null;
  const value = String(type).trim().toUpperCase();
  return value === 'FUNDS' || value === 'IN_KIND' ? value : null;
}

async function pledgeSponsorship({ sponsorId, eventId, type, amount, notes }) {
  const profile = await findSponsorProfile(sponsorId);
  if (!profile) {
    throw createHttpError(400, 'Sponsor profile is required before pledging');
  }
  const event = await findEventById(eventId);
  if (!event) {
    throw createHttpError(404, 'Event not found');
  }
  if (event.status !== 'PUBLISHED' && event.status !== 'COMPLETED') {
    throw createHttpError(400, 'Only active events can receive sponsorships');
  }
  const normalizedType = normalizeSponsorshipType(type);
  if (!normalizedType) {
    throw createHttpError(400, 'Sponsorship type must be FUNDS or IN_KIND');
  }
  let normalizedAmount = null;
  if (normalizedType === 'FUNDS') {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw createHttpError(400, 'Funds sponsorships require a positive amount');
    }
    normalizedAmount = Math.round(numericAmount * 100) / 100;
  } else if (amount !== undefined && amount !== null) {
    const numericAmount = Number(amount);
    if (Number.isFinite(numericAmount) && numericAmount >= 0) {
      normalizedAmount = Math.round(numericAmount * 100) / 100;
    }
  }

  const sponsorship = await createSponsorship({
    sponsorId,
    eventId,
    type: normalizedType,
    amount: normalizedAmount,
    notes: sanitizeString(notes),
    status: profile.status === 'APPROVED' ? 'PENDING' : 'PENDING',
  });

  const contact = await resolveSponsorContact(profile);

  if (contact.email) {
    try {
      await sendTemplatedEmail({
        to: contact.email,
        subject: `Thanks for pledging support for ${event.title}`,
        heading: 'We received your pledge',
        bodyLines: [
          `Hi ${contact.name},`,
          `Thank you for offering ${normalizedType === 'FUNDS' ? `₹${normalizedAmount?.toLocaleString('en-IN')}` : 'in-kind resources'} to <strong>${event.title}</strong>.`,
          'Our team will review and confirm the sponsorship shortly.',
        ],
        cta: {
          url: `${APP_BASE_URL}/app`,
          label: 'Track your sponsorships',
        },
        previewText: 'We received your sponsorship pledge',
      });
    } catch (error) {
      logger.warn('Failed to send sponsorship pledge email', {
        sponsorId,
        sponsorshipId: sponsorship.id,
        error: error.message,
      });
    }
  }

  logger.info('Sponsor pledged event support', {
    sponsorId,
    eventId,
    type: sponsorship.type,
    amount: sponsorship.amount,
  });

  return sponsorship;
}

async function listSponsorSponsorships(sponsorId) {
  return listSponsorshipsForSponsor(sponsorId);
}

async function updateSponsorshipApproval({ sponsorshipId, status }) {
  const sponsorship = await updateSponsorshipStatus({ sponsorshipId, status });
  const profile = await findSponsorProfile(sponsorship.sponsorId);
  let event = null;
  try {
    event = await findEventById(sponsorship.eventId);
  } catch (error) {
    logger.warn('Unable to load event while notifying sponsorship status change', {
      sponsorshipId,
      eventId: sponsorship.eventId,
      error: error.message,
    });
  }

  if (profile) {
    const contact = await resolveSponsorContact(profile);
    if (contact.email && sponsorship.status === 'APPROVED') {
      try {
        await sendTemplatedEmail({
          to: contact.email,
          subject: `Your sponsorship for ${event?.title || 'an Onkur event'} is confirmed`,
          heading: 'Sponsorship confirmed',
          bodyLines: [
            `Hi ${contact.name},`,
            `Your ${sponsorship.type === 'FUNDS' ? 'financial' : 'in-kind'} sponsorship for <strong>${event?.title || 'the event'}</strong> is confirmed.`,
            'You can expect shout-outs on the event page and gallery as soon as stories go live.',
          ],
          cta: {
            url: `${APP_BASE_URL}/app`,
            label: 'View sponsorship dashboard',
          },
          previewText: 'Sponsorship confirmed',
        });
      } catch (error) {
        logger.warn('Failed to send sponsorship approval email', {
          sponsorshipId,
          error: error.message,
        });
      }
    } else if (contact.email && sponsorship.status === 'DECLINED') {
      try {
        await sendTemplatedEmail({
          to: contact.email,
          subject: `Update on your sponsorship for ${event?.title || 'an Onkur event'}`,
          heading: 'Sponsorship update',
          bodyLines: [
            `Hi ${contact.name},`,
            'We are unable to accept this sponsorship at this time. Thank you for offering your support.',
          ],
          cta: null,
          previewText: 'Update on your sponsorship',
        });
      } catch (error) {
        logger.warn('Failed to send sponsorship decline email', {
          sponsorshipId,
          error: error.message,
        });
      }
    }
  }

  return sponsorship;
}

async function buildEventImpact(eventId) {
  const report = await generateEventReport(eventId);
  const metrics = await getGalleryMetrics(eventId);
  return {
    event: report.event,
    totals: report.totals,
    storedReport: report.storedReport,
    gallery: metrics,
  };
}

function computeRoi({ sponsorship, totals, gallery }) {
  const hours = Number(totals.totalHours || 0);
  const amount = sponsorship.amount || 0;
  const impressions = Number(gallery.viewCount || 0);
  const roi = {
    costPerHour: null,
    impressionsPerHour: null,
  };
  if (hours > 0 && amount) {
    roi.costPerHour = Math.round((amount / hours) * 100) / 100;
  }
  if (hours > 0 && impressions) {
    roi.impressionsPerHour = Math.round((impressions / hours) * 100) / 100;
  }
  return roi;
}

async function getSponsorDashboard({ sponsorId }) {
  const profile = await findSponsorProfile(sponsorId);
  if (!profile) {
    throw createHttpError(404, 'Sponsor profile not found');
  }
  const sponsorships = await listSponsorshipsForSponsor(sponsorId);
  const approvedSponsorships = sponsorships.filter((item) => item.status === 'APPROVED');
  const eventIds = Array.from(new Set(approvedSponsorships.map((item) => item.eventId)));
  const impacts = new Map();
  for (const eventId of eventIds) {
    try {
      impacts.set(eventId, await buildEventImpact(eventId));
    } catch (error) {
      logger.warn('Failed to build impact snapshot for sponsor dashboard', {
        sponsorId,
        eventId,
        error: error.message,
      });
    }
  }

  const metrics = {
    totalApprovedSponsorships: approvedSponsorships.length,
    totalFunds: approvedSponsorships
      .filter((item) => item.type === 'FUNDS' && typeof item.amount === 'number')
      .reduce((sum, item) => sum + item.amount, 0),
    totalVolunteerHours: 0,
    totalGalleryViews: 0,
  };
  for (const sponsorship of approvedSponsorships) {
    const impact = impacts.get(sponsorship.eventId);
    if (!impact) continue;
    metrics.totalVolunteerHours += Number(impact.totals.totalHours || 0);
    metrics.totalGalleryViews += Number(impact.gallery.viewCount || 0);
  }
  metrics.totalFunds = Math.round(metrics.totalFunds * 100) / 100;

  return {
    profile,
    sponsorships,
    metrics,
  };
}

async function getSponsorReports({ sponsorId }) {
  const profile = await findSponsorProfile(sponsorId);
  if (!profile) {
    throw createHttpError(404, 'Sponsor profile not found');
  }
  const sponsorships = await listSponsorshipsForSponsor(sponsorId);
  const approved = sponsorships.filter((item) => item.status === 'APPROVED');
  const reports = [];
  for (const sponsorship of approved) {
    try {
      const impact = await buildEventImpact(sponsorship.eventId);
      const roi = computeRoi({ sponsorship, totals: impact.totals, gallery: impact.gallery });
      const snapshot = {
        sponsorshipId: sponsorship.id,
        event: impact.event,
        totals: impact.totals,
        gallery: impact.gallery,
        contribution: {
          type: sponsorship.type,
          amount: sponsorship.amount,
          notes: sponsorship.notes,
          approvedAt: sponsorship.approvedAt,
        },
        roi,
      };
      reports.push(snapshot);
      await upsertReportSnapshot({ sponsorshipId: sponsorship.id, snapshot });
    } catch (error) {
      logger.warn('Failed to compute sponsorship impact report', {
        sponsorId,
        sponsorshipId: sponsorship.id,
        eventId: sponsorship.eventId,
        error: error.message,
      });
    }
  }

  if (reports.length) {
    const totalHours = reports.reduce(
      (sum, report) => sum + Number(report.totals.totalHours || 0),
      0
    );
    const totalViews = reports.reduce(
      (sum, report) => sum + Number(report.gallery.viewCount || 0),
      0
    );
    const totalFunds = reports
      .filter(
        (report) =>
          report.contribution.type === 'FUNDS' && typeof report.contribution.amount === 'number'
      )
      .reduce((sum, report) => sum + report.contribution.amount, 0);

    const contact = await resolveSponsorContact(profile);
    if (contact.email) {
      try {
        await sendTemplatedEmail({
          to: contact.email,
          subject: 'Your latest Onkur impact report',
          heading: 'Impact snapshot ready',
          bodyLines: [
            `Hi ${contact.name},`,
            `Approved sponsorships covered <strong>${reports.length}</strong> event${reports.length === 1 ? '' : 's'}.`,
            `Volunteers delivered <strong>${Math.round(totalHours * 100) / 100}</strong> hours and the galleries earned <strong>${totalViews}</strong> views.`,
            totalFunds
              ? `Direct funds contributed: <strong>₹${Math.round(totalFunds * 100) / 100}</strong>.`
              : 'In-kind support amplified every moment shared in the galleries.',
          ],
          cta: {
            url: `${APP_BASE_URL}/app`,
            label: 'Review detailed reports',
          },
          previewText: 'Your sponsorship impact snapshot is ready',
        });
        await markReportDelivered({ sponsorId });
      } catch (error) {
        logger.warn('Failed to send sponsor impact report email', {
          sponsorId,
          error: error.message,
        });
      }
    }
  }

  return { profile, reports };
}

async function attachApprovedSponsors(events = []) {
  const ids = Array.from(new Set(events.map((event) => event.id).filter(Boolean)));
  if (!ids.length) {
    return events;
  }
  const sponsorMap = await listApprovedEventSponsors(ids);
  return events.map((event) => ({
    ...event,
    sponsors: sponsorMap.get(event.id) || [],
  }));
}

async function attachSponsorPerspective({ events = [], sponsorId }) {
  if (!sponsorId) {
    return events;
  }
  const profile = await findSponsorProfile(sponsorId);
  if (!profile) {
    return events;
  }
  const ids = Array.from(new Set(events.map((event) => event.id).filter(Boolean)));
  if (!ids.length) {
    return events;
  }
  const contributionMap = await listEventSponsorshipsForSponsor({ sponsorId, eventIds: ids });
  return events.map((event) => ({
    ...event,
    mySponsorship: contributionMap.get(event.id) || null,
  }));
}

module.exports = {
  applyForSponsor,
  getSponsorProfile,
  updateProfile,
  listSponsorApplications,
  updateSponsorApproval,
  pledgeSponsorship,
  listSponsorSponsorships,
  updateSponsorshipApproval,
  getSponsorDashboard,
  getSponsorReports,
  attachApprovedSponsors,
  attachSponsorPerspective,
};
