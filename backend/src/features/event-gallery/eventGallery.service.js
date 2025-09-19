const { randomUUID } = require('crypto');
const sharp = require('sharp');
const { fileTypeFromBuffer } = require('file-type');
const config = require('../../config');
const logger = require('../../utils/logger');
const minioClient = require('../common/minio');
const { findUserById } = require('../auth/auth.repository');
const { findEventById } = require('../event-management/eventManagement.repository');
const { sendTemplatedEmail } = require('../email/email.service');
const {
  createMedia,
  listApprovedMediaForEvent,
  listPendingMedia,
  updateMediaStatus,
  incrementGalleryView,
  getGalleryMetrics,
  listGalleryEvents,
  listEventVolunteers,
  isVolunteerForEvent,
  listSponsors,
  findMediaById,
} = require('./eventGallery.repository');

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/heic', 'heic'],
]);

function resolveAppBaseUrl() {
  const base =
    (config.app && config.app.baseUrl) ||
    config.corsOrigin ||
    'http://localhost:3000';
  return String(base).replace(/\/$/, '');
}

function toTitleCase(value) {
  return String(value || '')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toSlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseTagsInput(input) {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input;
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      throw Object.assign(new Error('Tags must be valid JSON'), { statusCode: 400 });
    }
  }
  throw Object.assign(new Error('Tags must be provided as an array'), { statusCode: 400 });
}

function normalizeCaption(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const caption = String(value).trim();
  if (caption.length > 400) {
    throw Object.assign(new Error('Caption must be 400 characters or fewer'), { statusCode: 400 });
  }
  return caption;
}

async function ensureEvent(eventId) {
  const event = await findEventById(eventId);
  if (!event) {
    throw Object.assign(new Error('Event not found'), { statusCode: 404 });
  }
  return event;
}

function resolveRoles(user) {
  if (!user) {
    return new Set();
  }
  const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : [];
  if (user.role && !roles.includes(user.role)) {
    roles.push(user.role);
  }
  return new Set(roles);
}

async function ensureUploaderIsParticipant({ event, user }) {
  const roles = resolveRoles(user);
  if (roles.has('ADMIN')) {
    return true;
  }
  if (event.createdBy && event.createdBy === user.id) {
    return true;
  }
  const isVolunteer = await isVolunteerForEvent(event.id, user.id);
  if (isVolunteer) {
    return true;
  }
  throw Object.assign(new Error('Only event participants can upload media'), { statusCode: 403 });
}

async function processImageBuffer(file) {
  if (!file || !file.buffer || !file.buffer.length) {
    throw Object.assign(new Error('A photo file is required'), { statusCode: 400 });
  }

  if (file.buffer.length > MAX_UPLOAD_BYTES) {
    throw Object.assign(new Error('Photo must be 10MB or smaller'), { statusCode: 400 });
  }

  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw Object.assign(new Error('Only JPEG, PNG, WebP, or HEIC images are supported'), { statusCode: 415 });
  }

  const extension = ALLOWED_MIME_TYPES.get(detected.mime);
  const baseImage = sharp(file.buffer, { failOn: 'warning' }).rotate();
  const metadata = await baseImage.metadata();
  const processed = await baseImage
    .clone()
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, chromaSubsampling: '4:4:4', progressive: true })
    .toBuffer();

  if (processed.length > MAX_UPLOAD_BYTES) {
    throw Object.assign(new Error('Optimized photo exceeds the maximum size'), { statusCode: 400 });
  }

  return {
    buffer: processed,
    size: processed.length,
    width: metadata.width || null,
    height: metadata.height || null,
    mimeType: 'image/jpeg',
    extension: 'jpg',
  };
}

function buildStorageUrl({ bucket, key }) {
  const { endPoint, port, useSSL } = config.minio || {};
  if (!endPoint || !bucket) {
    return null;
  }
  const protocol = useSSL ? 'https' : 'http';
  const portPart = port && ![80, 443].includes(Number(port)) ? `:${port}` : '';
  return `${protocol}://${endPoint}${portPart}/${bucket}/${key}`;
}

async function storeImage({ eventId, buffer, mimeType, extension }) {
  const { bucket, endPoint, accessKey, secretKey } = config.minio || {};
  const storageKey = `events/${eventId}/media/${randomUUID()}.${extension}`;

  if (!bucket || !endPoint || !accessKey || !secretKey) {
    logger.warn('Media upload stored inline because MinIO/S3 is not configured', {
      bucketConfigured: Boolean(bucket),
      endPointConfigured: Boolean(endPoint),
    });
    const inlineUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    return { storageKey: `inline://${storageKey}`, url: inlineUrl, provider: 'inline' };
  }

  try {
    await minioClient.putObject(bucket, storageKey, buffer, buffer.length, {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    const url = buildStorageUrl({ bucket, key: storageKey }) || storageKey;
    return { storageKey, url, provider: 'object-store' };
  } catch (error) {
    logger.warn('Falling back to inline media storage after MinIO upload failed', {
      error: error.message,
      storageKey,
    });
    const inlineUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    return { storageKey: `inline://${storageKey}`, url: inlineUrl, provider: 'inline' };
  }
}

function buildCommunityTags(event) {
  const tags = [];
  if (event.cityName) {
    tags.push({ type: 'COMMUNITY', id: `city:${event.citySlug || toSlug(event.cityName)}`, label: event.cityName });
  }
  if (event.stateName) {
    tags.push({ type: 'COMMUNITY', id: `state:${event.stateCode || toSlug(event.stateName)}`, label: event.stateName });
  }
  if (event.theme) {
    tags.push({ type: 'COMMUNITY', id: `theme:${toSlug(event.theme)}`, label: toTitleCase(event.theme) });
  }
  return tags;
}

function sanitizeTags(rawTags, { volunteers, sponsors, event }) {
  const volunteersById = new Map((volunteers || []).map((vol) => [vol.id, vol]));
  const sponsorsById = new Map((sponsors || []).map((sponsor) => [sponsor.id, sponsor]));
  const sanitized = [];
  const seen = new Set();

  for (const raw of rawTags.slice(0, 12)) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const type = String(raw.type || '').toUpperCase();
    const id = raw.id ? String(raw.id) : '';
    const label = String(raw.label || '').trim();

    if (!type) {
      continue;
    }

    if (type === 'VOLUNTEER') {
      if (!id || !volunteersById.has(id)) {
        throw Object.assign(new Error('Volunteer tags must reference registered participants'), { statusCode: 400 });
      }
      const volunteer = volunteersById.get(id);
      const key = `${type}:${id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      sanitized.push({ type, id, label: volunteer.name || 'Volunteer' });
      continue;
    }

    if (type === 'SPONSOR') {
      if (!id || !sponsorsById.has(id)) {
        throw Object.assign(new Error('Sponsor tags must reference active sponsors'), { statusCode: 400 });
      }
      const sponsor = sponsorsById.get(id);
      const key = `${type}:${id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      sanitized.push({ type, id, label: sponsor.name || sponsor.email || 'Sponsor' });
      continue;
    }

    if (type === 'COMMUNITY') {
      const slug = id ? String(id) : toSlug(label);
      if (!slug) {
        continue;
      }
      const key = `${type}:${slug}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      sanitized.push({ type, id: slug, label: label || toTitleCase(slug.replace(/-/g, ' ')) });
    }
  }

  const defaults = buildCommunityTags(event);
  for (const tag of defaults) {
    const key = `${tag.type}:${tag.id}`;
    if (!seen.has(key)) {
      sanitized.push(tag);
      seen.add(key);
    }
  }

  return sanitized;
}

async function sendSubmissionEmail({ media, event, uploader }) {
  if (!uploader?.email) {
    return;
  }
  const baseUrl = resolveAppBaseUrl();
  const galleryUrl = `${baseUrl}/app/gallery?event=${event.id}`;
  try {
    await sendTemplatedEmail({
      to: uploader.email,
      subject: 'Your gallery submission is pending review',
      heading: 'We received your event gallery submission',
      previewText: 'Moderators will review your media shortly.',
      bodyLines: [
        `Thanks for sharing memories from <strong>${event.title}</strong>. Our moderators will review the photo soon.`,
        'You will get an email once it is approved or if we need any changes.',
      ],
      cta: {
        url: galleryUrl,
        label: 'View event gallery',
      },
    });
  } catch (error) {
    logger.warn('Failed to send gallery submission email', { mediaId: media.id, error: error.message });
  }
}

async function sendModerationEmail({ media, event, uploader, outcome, reason }) {
  if (!uploader?.email) {
    return;
  }
  const baseUrl = resolveAppBaseUrl();
  const galleryUrl = `${baseUrl}/app/gallery?event=${event.id}`;
  const approved = outcome === 'APPROVED';
  const heading = approved
    ? 'Your gallery submission is live!'
    : 'Your gallery submission needs attention';
  const subject = approved
    ? 'Your gallery submission was approved'
    : 'Your gallery submission was rejected';
  const bodyLines = approved
    ? [
        `Your photo for <strong>${event.title}</strong> is now visible in the event gallery.`,
        'Thanks for helping us tell a richer story of the day.',
      ]
    : [
        `We had to reject your photo for <strong>${event.title}</strong>.`,
        reason ? `Moderator note: ${reason}` : 'Please review the guidelines and try uploading again.',
      ];
  try {
    await sendTemplatedEmail({
      to: uploader.email,
      subject,
      heading,
      previewText: bodyLines[0],
      bodyLines,
      cta: approved
        ? {
            url: galleryUrl,
            label: 'Open gallery',
          }
        : undefined,
    });
  } catch (error) {
    logger.warn('Failed to send gallery moderation email', { mediaId: media.id, error: error.message, outcome });
  }
}

async function notifySponsors({ media, event, sponsors }) {
  if (!Array.isArray(sponsors) || !sponsors.length) {
    return;
  }
  const baseUrl = resolveAppBaseUrl();
  const galleryUrl = `${baseUrl}/app/gallery?event=${event.id}`;
  await Promise.all(
    sponsors.map(async (sponsor) => {
      if (!sponsor.email) {
        return;
      }
      try {
        await sendTemplatedEmail({
          to: sponsor.email,
          subject: `You were spotlighted in the ${event.title} gallery`,
          heading: `${event.title} just highlighted your support`,
          previewText: 'Dive in to see how your sponsorship made a difference.',
          bodyLines: [
            `${sponsor.name || 'Sponsor'}, your logo or name was tagged in the latest gallery update for <strong>${event.title}</strong>.`,
            'Take a look and share it with your community!',
          ],
          cta: {
            url: galleryUrl,
            label: 'View the gallery',
          },
        });
      } catch (error) {
        logger.warn('Failed to send sponsor gallery notification', {
          mediaId: media.id,
          sponsorId: sponsor.id,
          error: error.message,
        });
      }
    }),
  );
}

async function uploadMediaForEvent({ eventId, file, caption, tags, user }) {
  const event = await ensureEvent(eventId);
  await ensureUploaderIsParticipant({ event, user });

  const volunteers = await listEventVolunteers(eventId);
  const sponsors = await listSponsors();
  const parsedTags = parseTagsInput(tags);
  const sanitizedTags = sanitizeTags(parsedTags, { volunteers, sponsors, event });

  const processed = await processImageBuffer(file);
  const stored = await storeImage({
    eventId,
    buffer: processed.buffer,
    mimeType: processed.mimeType,
    extension: processed.extension,
  });

  const media = await createMedia({
    eventId,
    uploaderId: user.id,
    storageKey: stored.storageKey,
    url: stored.url,
    mimeType: processed.mimeType,
    fileSize: processed.size,
    width: processed.width,
    height: processed.height,
    caption: normalizeCaption(caption),
    tags: sanitizedTags,
    sponsorMentions: sanitizedTags.filter((tag) => tag.type === 'SPONSOR').length,
  });

  sendSubmissionEmail({ media, event, uploader: user }).catch((error) => {
    logger.warn('Failed to queue gallery submission email', { mediaId: media.id, error: error.message });
  });

  return media;
}

async function getEventGallery({ eventId, page, pageSize }) {
  const event = await ensureEvent(eventId);
  const pagination = await listApprovedMediaForEvent(eventId, { page, pageSize });
  await incrementGalleryView(eventId);
  const metrics = await getGalleryMetrics(eventId);
  return {
    event,
    ...pagination,
    metrics,
  };
}

async function listEventsWithGalleries({ page, pageSize }) {
  const result = await listGalleryEvents({ page, pageSize });
  return result;
}

async function getModerationQueue({ page, pageSize }) {
  return listPendingMedia({ page, pageSize });
}

async function moderateMedia({ mediaId, action, moderatorId, reason }) {
  const outcome = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : null;
  if (!outcome) {
    throw Object.assign(new Error('Unsupported moderation action'), { statusCode: 400 });
  }
  const media = await updateMediaStatus(mediaId, {
    status: outcome,
    approvedBy: outcome === 'APPROVED' ? moderatorId : null,
    rejectionReason: outcome === 'REJECTED' ? String(reason || '').trim() : null,
  });

  const event = await ensureEvent(media.eventId);
  const uploader = await findUserById(media.uploaderId);

  sendModerationEmail({ media, event, uploader, outcome: media.status, reason: media.rejectionReason }).catch((error) => {
    logger.warn('Failed to send moderation outcome email', { mediaId: media.id, error: error.message, outcome: media.status });
  });

  if (media.status === 'APPROVED') {
    const sponsorTags = (media.tags || []).filter((tag) => tag.type === 'SPONSOR');
    if (sponsorTags.length) {
      const sponsors = await listSponsors();
      const sponsorMap = new Map(sponsors.map((sponsor) => [sponsor.id, sponsor]));
      const notified = sponsorTags
        .map((tag) => sponsorMap.get(tag.id))
        .filter((sponsor) => sponsor && sponsor.email);
      notifySponsors({ media, event, sponsors: notified }).catch((error) => {
        logger.warn('Failed to notify sponsors after approval', { mediaId: media.id, error: error.message });
      });
    }
  }

  return media;
}

async function fetchMediaDetails(mediaId) {
  const media = await findMediaById(mediaId);
  if (!media) {
    throw Object.assign(new Error('Media not found'), { statusCode: 404 });
  }
  return media;
}

async function getTagOptions(eventId) {
  const event = await ensureEvent(eventId);
  const [volunteers, sponsors] = await Promise.all([
    listEventVolunteers(eventId),
    listSponsors(),
  ]);
  const communities = buildCommunityTags(event);
  return {
    volunteers,
    sponsors,
    communities,
  };
}

module.exports = {
  uploadMediaForEvent,
  getEventGallery,
  listEventsWithGalleries,
  getModerationQueue,
  moderateMedia,
  fetchMediaDetails,
  getTagOptions,
};
