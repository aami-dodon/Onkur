const config = require('../../config');
const logger = require('../../utils/logger');
const { sendTemplatedEmail } = require('../email/email.service');
const { findEventById } = require('../event-management/eventManagement.repository');
const {
  STORY_STATUSES,
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
} = require('./impact.repository');

const uuidPattern = /^[0-9a-fA-F-]{36}$/;

function ensureUuid(value, message) {
  if (!uuidPattern.test(value)) {
    const error = new Error(message || 'Invalid identifier');
    error.statusCode = 400;
    throw error;
  }
}

function normalizeMediaIds(mediaIds) {
  if (!Array.isArray(mediaIds)) {
    return [];
  }
  return mediaIds
    .map((value) => String(value || '').trim())
    .filter((value) => uuidPattern.test(value));
}

function formatStoryForResponse(story) {
  if (!story) {
    return null;
  }
  const excerpt = story.body && story.body.length > 220 ? `${story.body.slice(0, 217)}…` : story.body;
  return {
    ...story,
    excerpt,
  };
}

async function submitImpactStory({ eventId, author, title, body, mediaIds = [] }) {
  if (!author?.id) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }
  ensureUuid(eventId, 'Invalid event identifier');
  const trimmedTitle = String(title || '').trim();
  const trimmedBody = String(body || '').trim();
  if (trimmedTitle.length < 6) {
    const error = new Error('Stories need a descriptive title (6+ characters).');
    error.statusCode = 400;
    throw error;
  }
  if (trimmedBody.length < 40) {
    const error = new Error('Share at least a few sentences so the community can feel the impact (40+ characters).');
    error.statusCode = 400;
    throw error;
  }
  const event = await findEventById(eventId);
  if (!event) {
    const error = new Error('Event not found');
    error.statusCode = 404;
    throw error;
  }
  const normalizedMediaIds = normalizeMediaIds(mediaIds);
  const storyRecord = await createStory({
    eventId,
    authorId: author.id,
    title: trimmedTitle,
    body: trimmedBody,
    mediaIds: normalizedMediaIds,
  });
  await incrementDailyMetric({ metricKey: 'stories_submitted', amount: 1 });
  const freshStory = await findStoryById(storyRecord.id);
  return {
    story: formatStoryForResponse(freshStory),
    event: {
      id: event.id,
      title: event.title,
      theme: event.theme,
    },
  };
}

async function getEventImpactStories({ eventId, limit = 12, recordView = true }) {
  ensureUuid(eventId, 'Invalid event identifier');
  const stories = await listStoriesForEvent(eventId, { limit, statuses: ['APPROVED'] });
  if (recordView && stories.length) {
    await incrementDailyMetric({ metricKey: 'story_views', amount: stories.length });
  }
  return stories.map(formatStoryForResponse);
}

async function getStoryModerationQueue({ page = 1, pageSize = 20, status = 'PENDING' }) {
  const normalized = String(status || 'PENDING').toUpperCase();
  if (!STORY_STATUSES.includes(normalized)) {
    const error = new Error('Unsupported story status filter');
    error.statusCode = 400;
    throw error;
  }
  return listStoriesForModeration({ page, pageSize, status: normalized });
}

async function notifyStoryApproved({ story, event }) {
  if (!story?.authorEmail) {
    return;
  }
  const ctaUrl = `${config.app.baseUrl.replace(/\/$/, '')}/app/gallery?event=${story.eventId}`;
  try {
    await sendTemplatedEmail({
      to: story.authorEmail,
      subject: 'Your impact story is live',
      heading: 'Thank you for sharing your impact 🌿',
      bodyLines: [
        `Hi ${story.authorName?.split(' ')[0] || 'there'},`,
        `Your story "${story.title}" for ${event?.title || 'an Onkur event'} has been approved and is now inspiring the community.`,
        'Share the gallery with your crew so they can relive the moments and keep the momentum growing.',
      ],
      cta: {
        label: 'View your story',
        url: ctaUrl,
      },
    });
  } catch (error) {
    logger.warn('Failed to send story approval email', {
      err: error.message,
      storyId: story.id,
    });
  }
}

async function notifyStoryRejected({ story, event, reason }) {
  if (!story?.authorEmail) {
    return;
  }
  try {
    await sendTemplatedEmail({
      to: story.authorEmail,
      subject: 'Update on your impact story',
      heading: 'A quick note about your story',
      bodyLines: [
        `Hi ${story.authorName?.split(' ')[0] || 'there'},`,
        `Thanks for submitting "${story.title}" for ${event?.title || 'an Onkur gathering'}.`,
        reason
          ? `We had to hold it back for now: ${reason}`
          : 'We had to hold it back for now while we fine-tune moderation guidelines. Feel free to resubmit after a quick edit.',
        'Reply to this email if you need help refining the story—we’re here to support your voice.',
      ],
    });
  } catch (error) {
    logger.warn('Failed to send story rejection email', {
      err: error.message,
      storyId: story.id,
    });
  }
}

async function notifySponsorsOfStory({ sponsors = [], story, event }) {
  if (!Array.isArray(sponsors) || !sponsors.length) {
    return;
  }
  const galleryUrl = `${config.app.baseUrl.replace(/\/$/, '')}/app/gallery?event=${story.eventId}`;
  await Promise.all(
    sponsors.map(async (sponsor) => {
      if (!sponsor.contactEmail) {
        return;
      }
      try {
        await sendTemplatedEmail({
          to: sponsor.contactEmail,
          subject: `${event?.title || 'Onkur event'} impact story spotlight`,
          heading: 'Your support is in the spotlight',
          bodyLines: [
            `Hi ${sponsor.contactName || sponsor.orgName || 'sponsor'},`,
            `A new story for ${event?.title || 'an Onkur event'} is now live and highlights the community impact your sponsorship made possible.`,
            'Share it with your stakeholders to celebrate how your partnership is changing lives.',
          ],
          cta: {
            label: 'Read the story',
            url: galleryUrl,
          },
        });
      } catch (error) {
        logger.warn('Failed to notify sponsor about impact story', {
          err: error.message,
          storyId: story.id,
          sponsorId: sponsor.sponsorId,
        });
      }
    }),
  );
}

async function approveImpactStory({ storyId, moderator }) {
  if (!moderator?.id) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }
  ensureUuid(storyId, 'Invalid story identifier');
  const updated = await updateStoryStatus({ storyId, status: 'APPROVED', moderatorId: moderator.id });
  if (!updated) {
    const error = new Error('Story not found');
    error.statusCode = 404;
    throw error;
  }
  const event = await findEventById(updated.eventId);
  const sponsors = await listEventSponsorsWithContacts(updated.eventId);
  await incrementDailyMetric({ metricKey: 'stories_published', amount: 1 });
  await notifyStoryApproved({ story: updated, event });
  await notifySponsorsOfStory({ sponsors, story: updated, event });
  return formatStoryForResponse(updated);
}

async function rejectImpactStory({ storyId, moderator, reason }) {
  if (!moderator?.id) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }
  ensureUuid(storyId, 'Invalid story identifier');
  const trimmedReason = reason ? String(reason).trim() : '';
  const updated = await updateStoryStatus({
    storyId,
    status: 'REJECTED',
    moderatorId: moderator.id,
    rejectionReason: trimmedReason || null,
  });
  if (!updated) {
    const error = new Error('Story not found');
    error.statusCode = 404;
    throw error;
  }
  const event = await findEventById(updated.eventId);
  await incrementDailyMetric({ metricKey: 'stories_rejected', amount: 1 });
  await notifyStoryRejected({ story: updated, event, reason: trimmedReason });
  return formatStoryForResponse(updated);
}

function computeRetentionChange({ activeLast90Days, previous90Days }) {
  if (!previous90Days) {
    return activeLast90Days ? 1 : 0;
  }
  return (activeLast90Days - previous90Days) / previous90Days;
}

function buildTrendSeries(metrics) {
  const grouped = metrics.reduce((acc, entry) => {
    if (!entry?.metricKey || !entry?.date) {
      return acc;
    }
    if (!acc[entry.metricKey]) {
      acc[entry.metricKey] = [];
    }
    acc[entry.metricKey].push({ date: entry.date, value: entry.value });
    return acc;
  }, {});
  return grouped;
}

async function loadImpactAnalytics({ recordView = true } = {}) {
  if (recordView) {
    await incrementDailyMetric({ metricKey: 'analytics_dashboard_views', amount: 1 });
  }
  const [storyCounts, volunteerHours, participation, gallery, sponsorImpact, usage, recentMetrics] = await Promise.all([
    getStoryCountsByStatus(),
    getVolunteerHoursAggregate(),
    getEventParticipationSummary(),
    getGalleryEngagementSummary(),
    getSponsorImpactSummary(),
    getAnalyticsUsageSummary(),
    listRecentMetrics({ days: 45 }),
  ]);
  const totalStories = Object.values(storyCounts).reduce((sum, value) => sum + Number(value || 0), 0);
  const volunteerHoursTotal = volunteerHours.totalMinutes || 0;
  const retentionDelta = computeRetentionChange(volunteerHours);
  return {
    stories: {
      total: totalStories,
      submitted: Number(storyCounts.PENDING || 0) + Number(storyCounts.APPROVED || 0) + Number(storyCounts.REJECTED || 0),
      approved: Number(storyCounts.APPROVED || 0),
      pending: Number(storyCounts.PENDING || 0),
      rejected: Number(storyCounts.REJECTED || 0),
    },
    volunteerEngagement: {
      totalMinutes: volunteerHoursTotal,
      totalHours: volunteerHoursTotal / 60,
      activeLast90Days: volunteerHours.activeLast90Days || 0,
      previous90Days: volunteerHours.previous90Days || 0,
      retentionDelta,
    },
    eventParticipation: participation,
    galleryEngagement: gallery,
    sponsorImpact,
    analyticsUsage: usage,
    trends: buildTrendSeries(recentMetrics),
  };
}

async function getImpactAnalyticsOverview() {
  const overview = await loadImpactAnalytics({ recordView: true });
  return overview;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function buildAnalyticsReportCsv(overview) {
  const rows = [
    ['Section', 'Metric', 'Value'],
    ['Stories', 'Total stories', formatNumber(overview.stories.total)],
    ['Stories', 'Approved', formatNumber(overview.stories.approved)],
    ['Stories', 'Pending review', formatNumber(overview.stories.pending)],
    ['Stories', 'Rejected', formatNumber(overview.stories.rejected)],
    ['Volunteer engagement', 'Total hours logged', formatNumber(overview.volunteerEngagement.totalHours)],
    ['Volunteer engagement', 'Active volunteers (90d)', formatNumber(overview.volunteerEngagement.activeLast90Days)],
    ['Volunteer engagement', 'Retention change vs prev 90d', `${(overview.volunteerEngagement.retentionDelta * 100).toFixed(2)}%`],
    ['Event participation', 'Total signups', formatNumber(overview.eventParticipation.totalSignups)],
    ['Event participation', 'Unique volunteers', formatNumber(overview.eventParticipation.uniqueVolunteers)],
    ['Event participation', 'Events supported', formatNumber(overview.eventParticipation.eventsSupported)],
    ['Gallery engagement', 'Gallery views recorded', formatNumber(overview.galleryEngagement.totalViews)],
    ['Gallery engagement', 'Events with gallery analytics', formatNumber(overview.galleryEngagement.trackedEvents)],
    ['Gallery engagement', 'Approved media assets', formatNumber(overview.galleryEngagement.approvedMedia)],
    ['Sponsor impact', 'Approved sponsorships', formatNumber(overview.sponsorImpact.approvedSponsorships)],
    ['Sponsor impact', 'Approved sponsorship amount', formatNumber(overview.sponsorImpact.approvedAmount)],
    ['Sponsor impact', 'Sponsor mentions in galleries', formatNumber(overview.sponsorImpact.sponsorMentions)],
    ['Analytics usage', 'Dashboard views (30d)', formatNumber(overview.analyticsUsage.viewsLast30Days)],
    ['Analytics usage', 'Dashboard views recorded', formatNumber(overview.analyticsUsage.totalRecordedViews)],
  ];
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const cell = String(value ?? '');
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(','),
    )
    .join('\n');
  return csv;
}

async function exportImpactAnalyticsReport() {
  const overview = await loadImpactAnalytics({ recordView: false });
  const csv = buildAnalyticsReportCsv(overview);
  const filename = `onkur-impact-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}

module.exports = {
  submitImpactStory,
  getEventImpactStories,
  getStoryModerationQueue,
  approveImpactStory,
  rejectImpactStory,
  getImpactAnalyticsOverview,
  exportImpactAnalyticsReport,
};
