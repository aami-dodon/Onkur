const { randomUUID } = require('crypto');
const { newDb } = require('pg-mem');

describe('impact.service', () => {
  let pool;
  let impactService;
  let sendTemplatedEmailMock;
  let eventsStore;

  beforeEach(async () => {
    jest.resetModules();

    const db = newDb({ autoCreateForeignKeyIndices: true });
    const pg = db.adapters.createPg();
    pool = new pg.Pool();
    eventsStore = new Map();

    jest.doMock('../src/features/common/db', () => pool);
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));
    jest.doMock('../src/config', () => ({
      app: {
        baseUrl: 'https://onkur.test',
      },
    }));

    sendTemplatedEmailMock = jest.fn().mockResolvedValue(undefined);
    jest.doMock('../src/features/email/email.service', () => ({
      sendTemplatedEmail: sendTemplatedEmailMock,
    }));

    jest.doMock('../src/features/event-management/eventManagement.repository', () => ({
      findEventById: jest.fn(async (eventId) => eventsStore.get(eventId) || null),
    }));

    jest.doMock('../src/features/volunteer-journey/volunteerJourney.repository', () => ({
      ensureSchema: jest.fn(async () => {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            name TEXT,
            email TEXT,
            role TEXT
          )
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS events (
            id UUID PRIMARY KEY,
            title TEXT,
            description TEXT,
            theme TEXT,
            status TEXT
          )
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS volunteer_hours (
            id UUID,
            user_id UUID,
            event_id UUID,
            minutes INTEGER,
            created_at TIMESTAMPTZ
          )
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS event_signups (
            id UUID,
            event_id UUID,
            user_id UUID,
            created_at TIMESTAMPTZ
          )
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS event_media (
            id UUID,
            event_id UUID,
            caption TEXT,
            status TEXT,
            sponsor_mentions INTEGER,
            created_at TIMESTAMPTZ
          )
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS event_gallery_metrics (
            event_id UUID,
            view_count BIGINT,
            last_viewed_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ
          )
        `);
      }),
    }));

    jest.doMock('../src/features/sponsors/sponsor.repository', () => ({
      ensureSchema: jest.fn(async () => {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS sponsor_profiles (
            user_id UUID,
            org_name TEXT,
            contact_name TEXT,
            contact_email TEXT,
            status TEXT
          )
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS sponsorships (
            id UUID,
            sponsor_id UUID,
            event_id UUID,
            status TEXT,
            amount NUMERIC(12,2)
          )
        `);
      }),
    }));

    impactService = require('../src/features/impact/impact.service');
    require('../src/features/impact/impact.repository');
  });

  afterEach(async () => {
    await pool.end();
  });

  test('submitImpactStory stores the draft and increments analytics', async () => {
    const eventId = randomUUID();
    const authorId = randomUUID();

    eventsStore.set(eventId, {
      id: eventId,
      title: 'River clean-up',
      theme: 'Water stewardship',
    });

    await pool.query('INSERT INTO users (id, name, email) VALUES ($1,$2,$3)', [
      authorId,
      'Beneficiary Author',
      'beneficiary@example.com',
    ]);
    await pool.query('INSERT INTO events (id, title, description, theme) VALUES ($1,$2,$3,$4)', [
      eventId,
      'River clean-up',
      'Cleaning the local river banks',
      'Water stewardship',
    ]);

    const result = await impactService.submitImpactStory({
      eventId,
      author: { id: authorId },
      title: 'A ripple through the community',
      body: 'Our community came together to restore the riverbanks and inspire the neighbourhood to join future clean-ups.',
      mediaIds: [],
    });

    expect(result.story).toMatchObject({
      eventId,
      authorId,
      status: 'PENDING',
    });

    const analytics = await pool.query(
      "SELECT value FROM analytics_daily WHERE metric_key = 'stories_submitted'",
    );
    expect(Number(analytics.rows[0]?.value)).toBe(1);
  });

  test('approveImpactStory publishes the story, alerts sponsors, and records analytics', async () => {
    const eventId = randomUUID();
    const authorId = randomUUID();
    const moderatorId = randomUUID();
    const sponsorA = randomUUID();
    const sponsorB = randomUUID();

    eventsStore.set(eventId, {
      id: eventId,
      title: 'Tree planting drive',
      theme: 'Urban canopy',
    });

    await Promise.all([
      pool.query('INSERT INTO users (id, name, email, role) VALUES ($1,$2,$3,$4)', [
        authorId,
        'Story Author',
        'storyteller@example.com',
        'VOLUNTEER',
      ]),
      pool.query('INSERT INTO users (id, name, email, role) VALUES ($1,$2,$3,$4)', [
        moderatorId,
        'Admin Reviewer',
        'admin@example.com',
        'ADMIN',
      ]),
      pool.query('INSERT INTO users (id, name, email, role) VALUES ($1,$2,$3,$4)', [
        sponsorA,
        'Sponsor A',
        'sponsorA@example.com',
        'SPONSOR',
      ]),
      pool.query('INSERT INTO users (id, name, email, role) VALUES ($1,$2,$3,$4)', [
        sponsorB,
        'Sponsor B',
        'sponsorB@example.com',
        'SPONSOR',
      ]),
    ]);

    await pool.query('INSERT INTO events (id, title, description, theme) VALUES ($1,$2,$3,$4)', [
      eventId,
      'Tree planting drive',
      'Planting saplings across the ward',
      'Urban canopy',
    ]);

    const { story } = await impactService.submitImpactStory({
      eventId,
      author: { id: authorId },
      title: 'Saplings took root',
      body: 'Volunteers planted 100 saplings and neighbours pledged to water them every week as part of the campaign.',
      mediaIds: [],
    });

    await pool.query(
      'INSERT INTO sponsor_profiles (user_id, org_name, contact_name, contact_email, status) VALUES ($1,$2,$3,$4,$5)',
      [sponsorA, 'Green Roots', 'Riya', 'riya@greenroots.org', 'APPROVED'],
    );
    await pool.query(
      'INSERT INTO sponsor_profiles (user_id, org_name, contact_name, contact_email, status) VALUES ($1,$2,$3,$4,$5)',
      [sponsorB, 'Eco Friends', 'Dev', null, 'APPROVED'],
    );
    await pool.query(
      'INSERT INTO sponsorships (id, sponsor_id, event_id, status, amount) VALUES ($1,$2,$3,$4,$5)',
      [randomUUID(), sponsorA, eventId, 'APPROVED', 5000],
    );
    await pool.query(
      'INSERT INTO sponsorships (id, sponsor_id, event_id, status, amount) VALUES ($1,$2,$3,$4,$5)',
      [randomUUID(), sponsorB, eventId, 'APPROVED', 2500],
    );

    sendTemplatedEmailMock.mockClear();

    const updated = await impactService.approveImpactStory({
      storyId: story.id,
      moderator: { id: moderatorId },
    });

    expect(updated.status).toBe('APPROVED');
    expect(sendTemplatedEmailMock).toHaveBeenCalledTimes(3);

    const publishedMetric = await pool.query(
      "SELECT value FROM analytics_daily WHERE metric_key = 'stories_published'",
    );
    expect(Number(publishedMetric.rows[0]?.value)).toBe(1);
  });

  test('getImpactAnalyticsOverview aggregates cross-cutting metrics', async () => {
    const eventId = randomUUID();
    const otherEventId = randomUUID();
    const authorId = randomUUID();
    const moderatorId = randomUUID();

    eventsStore.set(eventId, {
      id: eventId,
      title: 'Mangrove restoration',
      theme: 'Coastal resilience',
    });
    eventsStore.set(otherEventId, {
      id: otherEventId,
      title: 'Community garden',
      theme: 'Food justice',
    });

    await pool.query('INSERT INTO users (id, name, email, role) VALUES ($1,$2,$3,$4)', [
      authorId,
      'Volunteer Voice',
      'voice@example.com',
      'VOLUNTEER',
    ]);
    await pool.query('INSERT INTO users (id, name, email, role) VALUES ($1,$2,$3,$4)', [
      moderatorId,
      'Moderator',
      'moderator@example.com',
      'ADMIN',
    ]);
    await Promise.all([
      pool.query('INSERT INTO events (id, title, description, theme) VALUES ($1,$2,$3,$4)', [
        eventId,
        'Mangrove restoration',
        'Restoring tidal mangroves',
        'Coastal resilience',
      ]),
      pool.query('INSERT INTO events (id, title, description, theme) VALUES ($1,$2,$3,$4)', [
        otherEventId,
        'Community garden',
        'Building a shared food garden',
        'Food justice',
      ]),
    ]);

    const pending = await impactService.submitImpactStory({
      eventId,
      author: { id: authorId },
      title: 'Mangroves breathing again',
      body: 'We replanted native mangroves and trained youth to monitor their growth along the shoreline.',
      mediaIds: [],
    });
    const rejected = await impactService.submitImpactStory({
      eventId,
      author: { id: authorId },
      title: 'Another voice',
      body: 'This submission needs revisions but still counts toward total storytelling engagement for the event.',
      mediaIds: [],
    });
    const approved = await impactService.submitImpactStory({
      eventId: otherEventId,
      author: { id: authorId },
      title: 'Garden flourishing',
      body: 'Community members harvested 50kg of produce and pledged ongoing support.',
      mediaIds: [],
    });

    await impactService.approveImpactStory({ storyId: approved.story.id, moderator: { id: moderatorId } });
    await impactService.rejectImpactStory({ storyId: rejected.story.id, moderator: { id: moderatorId }, reason: 'Needs edits' });

    await pool.query(
      'INSERT INTO volunteer_hours (id, user_id, event_id, minutes, created_at) VALUES ($1,$2,$3,$4, NOW() - INTERVAL \'15 days\')',
      [randomUUID(), authorId, eventId, 180],
    );
    await pool.query(
      'INSERT INTO volunteer_hours (id, user_id, event_id, minutes, created_at) VALUES ($1,$2,$3,$4, NOW() - INTERVAL \'60 days\')',
      [randomUUID(), authorId, otherEventId, 120],
    );
    await pool.query(
      'INSERT INTO volunteer_hours (id, user_id, event_id, minutes, created_at) VALUES ($1,$2,$3,$4, NOW() - INTERVAL \'120 days\')',
      [randomUUID(), authorId, eventId, 90],
    );

    await pool.query(
      'INSERT INTO event_signups (id, event_id, user_id, created_at) VALUES ($1,$2,$3,NOW() - INTERVAL \'2 days\')',
      [randomUUID(), eventId, authorId],
    );
    await pool.query(
      'INSERT INTO event_signups (id, event_id, user_id, created_at) VALUES ($1,$2,$3,NOW() - INTERVAL \'10 days\')',
      [randomUUID(), otherEventId, authorId],
    );

    await pool.query(
      'INSERT INTO event_media (id, event_id, caption, status, sponsor_mentions) VALUES ($1,$2,$3,$4,$5)',
      [randomUUID(), eventId, 'Gallery highlight', 'APPROVED', 4],
    );
    await pool.query(
      'INSERT INTO event_media (id, event_id, caption, status, sponsor_mentions) VALUES ($1,$2,$3,$4,$5)',
      [randomUUID(), otherEventId, 'Garden photo', 'APPROVED', 2],
    );

    await pool.query(
      'INSERT INTO event_gallery_metrics (event_id, view_count, last_viewed_at) VALUES ($1,$2,NOW() - INTERVAL \'1 day\')',
      [eventId, 120],
    );
    await pool.query(
      'INSERT INTO event_gallery_metrics (event_id, view_count, last_viewed_at) VALUES ($1,$2,NOW() - INTERVAL \'4 days\')',
      [otherEventId, 45],
    );

    await pool.query(
      "INSERT INTO analytics_daily (date, metric_key, value) VALUES (CURRENT_DATE, 'analytics_dashboard_views', 4)",
    );
    await pool.query(
      "INSERT INTO analytics_daily (date, metric_key, value) VALUES (CURRENT_DATE - INTERVAL '10 days', 'analytics_dashboard_views', 3)",
    );
    await pool.query(
      "INSERT INTO analytics_daily (date, metric_key, value) VALUES (CURRENT_DATE - INTERVAL '40 days', 'analytics_dashboard_views', 2)",
    );

    const overview = await impactService.getImpactAnalyticsOverview();

    expect(overview.stories).toMatchObject({
      approved: 1,
      pending: 1,
      rejected: 1,
      total: 3,
    });
    expect(overview.volunteerEngagement.totalMinutes).toBe(390);
    expect(overview.eventParticipation.totalSignups).toBe(2);
    expect(overview.galleryEngagement.totalViews).toBe(165);
    expect(overview.sponsorImpact.sponsorMentions).toBe(6);
    expect(overview.analyticsUsage.viewsLast30Days).toBe(8);
    expect(overview.analyticsUsage.totalRecordedViews).toBe(10);
  });
});
