const { newDb } = require('pg-mem');

describe('auth.service', () => {
  let pool;
  let authService;

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

    authService = require('../src/features/auth/auth.service');
  });

  afterEach(() => {
    jest.resetModules();
  });

  test('signup stores a new volunteer and login succeeds', async () => {
    const signupResult = await authService.signup({
      name: 'Test User',
      email: 'user@example.com',
      password: 'super-secret',
    });

    expect(signupResult.user).toMatchObject({
      name: 'Test User',
      email: 'user@example.com',
      role: 'VOLUNTEER',
    });
    expect(signupResult.user.roles).toEqual(['VOLUNTEER']);
    expect(signupResult.requiresEmailVerification).toBe(true);

    const tokenRow = await pool.query(
      'SELECT token FROM email_verification_tokens WHERE user_id = $1',
      [signupResult.user.id]
    );
    expect(tokenRow.rows[0]?.token).toBeTruthy();

    await authService.verifyEmail({ token: tokenRow.rows[0].token });

    const loginResult = await authService.login({
      email: 'user@example.com',
      password: 'super-secret',
    });

    expect(loginResult.user).toMatchObject({ email: 'user@example.com' });
    expect(loginResult.token).toBeTruthy();
  });

  test('assignRole elevates a user when invoked by an admin', async () => {
    const admin = await authService.signup({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
    });
    const volunteer = await authService.signup({
      name: 'Volunteer',
      email: 'volunteer@example.com',
      password: 'password123',
    });

    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['ADMIN', admin.user.id]);

    const updated = await authService.assignRole({
      actorId: admin.user.id,
      userId: volunteer.user.id,
      roles: ['EVENT_MANAGER', 'SPONSOR'],
    });

    expect(updated).toMatchObject({
      id: volunteer.user.id,
      role: 'EVENT_MANAGER',
    });
    expect(updated.roles).toEqual(['EVENT_MANAGER', 'SPONSOR']);
  });

  test('signup respects requested roles except admin', async () => {
    const signupResult = await authService.signup({
      name: 'Multi Role User',
      email: 'multi@example.com',
      password: 'password123',
      roles: ['volunteer', 'sponsor', 'admin'],
    });

    expect(signupResult.user.roles).toEqual(['VOLUNTEER', 'SPONSOR']);
    expect(signupResult.user.role).toBe('VOLUNTEER');
  });

  test('logout revokes token so it cannot be reused', async () => {
    const signupResult = await authService.signup({
      name: 'Another User',
      email: 'another@example.com',
      password: 'password123',
    });

    const tokenRow = await pool.query(
      'SELECT token FROM email_verification_tokens WHERE user_id = $1',
      [signupResult.user.id]
    );
    await authService.verifyEmail({ token: tokenRow.rows[0].token });

    const { token, jti, user } = await authService.login({
      email: 'another@example.com',
      password: 'password123',
    });

    const verified = await authService.verifyToken(token);
    expect(verified.user.email).toBe('another@example.com');

    const payloadSegment = token.split('.')[1];
    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const payloadBuffer = Buffer.from(
      normalized + '==='.slice((normalized.length + 3) % 4),
      'base64'
    );
    const decoded = JSON.parse(payloadBuffer.toString());
    const expiresAt = new Date(decoded.exp * 1000).toISOString();

    await authService.logout({ jti, expiresAt, actorId: user.id });

    await expect(authService.verifyToken(token)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});
