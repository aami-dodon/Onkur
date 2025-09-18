const { newDb } = require('pg-mem');
const { randomUUID } = require('crypto');

describe('volunteerJourney.service', () => {
  let pool;
  let authService;
  let volunteerService;
  let emailServiceMock;
  let repository;

  beforeEach(async () => {
    jest.resetModules();

    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ISSUER = 'test-suite';
    process.env.JWT_EXPIRY = '1h';
    process.env.BCRYPT_SALT_ROUNDS = '1';

    const db = newDb({ autoCreateForeignKeyIndices: true });
    const pg = db.adapters.createPg();
    pool = new pg.Pool();

    jest.doMock('../src/features/common/db', () => pool);
    jest.doMock('../src/utils/logger', () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }));
    emailServiceMock = {
      sendTemplatedEmail: jest.fn().mockResolvedValue(null),
    };
    jest.doMock('../src/features/email/email.service', () => emailServiceMock);
    jest.doMock('../src/features/auth/email.service', () => ({
      sendVerificationEmail: jest.fn().mockResolvedValue(null),
      sendWelcomeEmail: jest.fn().mockResolvedValue(null),
    }));

    authService = require('../src/features/auth/auth.service');
    volunteerService = require('../src/features/volunteer-journey/volunteerJourney.service');
    repository = require('../src/features/volunteer-journey/volunteerJourney.repository');
  });

  afterEach(() => {
    jest.resetModules();
  });

  async function createVolunteer({ name = 'Volunteer One', email = 'volunteer1@example.com', password = 'password123' } = {}) {
    const signup = await authService.signup({ name, email, password });
    const tokenRow = await pool.query('SELECT token FROM email_verification_tokens WHERE user_id = $1', [
      signup.user.id,
    ]);
    if (tokenRow.rows[0]) {
      await authService.verifyEmail({ token: tokenRow.rows[0].token });
    }
    const login = await authService.login({ email, password });
    return login.user;
  }

  async function createPublishedEvent({
    title = 'Community Clean-up',
    description = 'Help restore the local park.',
    category = 'clean-up',
    theme = 'nature',
    location = 'Riverfront',
    capacity = 10,
    status = 'published',
    startOffsetHours = 48,
    durationHours = 2,
  } = {}) {
    await repository.ensureSchema();
    const id = randomUUID();
    const start = new Date(Date.now() + startOffsetHours * 60 * 60 * 1000);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    await pool.query(
      `
        INSERT INTO events (id, title, description, category, theme, date_start, date_end, location, capacity, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `,
      [id, title, description, category, theme, start, end, location, capacity, status]
    );
    return { id, title, description, category, theme, location, capacity, status, start, end };
  }

  test('updates and reads volunteer profile fields with normalization', async () => {
    const volunteer = await createVolunteer();

    const updated = await volunteerService.updateProfile({
      userId: volunteer.id,
      skills: ['Tree Planting', 'tree planting', 'Community Outreach'],
      interests: ['Forests', 'Education'],
      availability: ['Weekends', 'weekday-evenings'],
      location: ' Pune ',
      state: ' maharashtra ',
      bio: 'Ready to help nurture our urban forests.',
    });

    expect(updated.skills).toEqual(['tree planting', 'community outreach']);
    expect(updated.interests).toEqual(['forests', 'education']);
    expect(updated.availability).toEqual(['weekends', 'weekday-evenings']);
    expect(updated.location).toBe('Pune');
    expect(updated.state).toBe('Maharashtra');

    const profile = await volunteerService.getProfile(volunteer.id);
    expect(profile.skills).toEqual(updated.skills);
    expect(profile.interests).toEqual(updated.interests);
    expect(profile.availability).toEqual(updated.availability);
    expect(profile.state).toBe(updated.state);

    const catalogs = await volunteerService.getProfileCatalogs();
    expect(Array.isArray(catalogs.skills)).toBe(true);
    expect(catalogs.skills.length).toBeGreaterThan(0);
    expect(catalogs.locations.some((option) => option.value === 'Pune')).toBe(true);
  });

  test('event signup enforces uniqueness and capacity while sending confirmation email', async () => {
    const primaryVolunteer = await createVolunteer({ name: 'Primary', email: 'primary@example.com' });
    const secondaryVolunteer = await createVolunteer({ name: 'Secondary', email: 'secondary@example.com' });
    const event = await createPublishedEvent({ capacity: 1, location: 'Lakeside' });

    const list = await volunteerService.browseEvents({ location: 'Lakeside' }, { userId: primaryVolunteer.id });
    expect(list).toHaveLength(1);

    const signup = await volunteerService.signupForEvent({ eventId: event.id, user: primaryVolunteer });
    expect(signup.event.isRegistered).toBe(true);
    expect(emailServiceMock.sendTemplatedEmail).toHaveBeenCalledTimes(1);

    await expect(volunteerService.signupForEvent({ eventId: event.id, user: primaryVolunteer })).rejects.toMatchObject({
      statusCode: 409,
    });

    await expect(volunteerService.signupForEvent({ eventId: event.id, user: secondaryVolunteer })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('logging hours requires a signup and unlocks badges as thresholds are reached', async () => {
    const volunteer = await createVolunteer({ name: 'Hours Hero', email: 'hours@example.com' });
    const event = await createPublishedEvent({ capacity: 5 });

    await expect(
      volunteerService.recordVolunteerHours({ userId: volunteer.id, eventId: event.id, minutes: 60 })
    ).rejects.toMatchObject({ statusCode: 400 });

    await volunteerService.signupForEvent({ eventId: event.id, user: volunteer });

    await volunteerService.recordVolunteerHours({ userId: volunteer.id, eventId: event.id, minutes: 300 });
    await volunteerService.recordVolunteerHours({ userId: volunteer.id, eventId: event.id, minutes: 320 });

    const hours = await volunteerService.getVolunteerHours(volunteer.id);
    expect(hours.totalMinutes).toBe(620);
    const seedlingBadge = hours.badges.find((badge) => badge.slug === 'seedling');
    expect(seedlingBadge.earned).toBe(true);
    expect(seedlingBadge.thresholdHours).toBe(10);
  });
});
