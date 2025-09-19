const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const logger = require('../../utils/logger');
const {
  createUser,
  findUserByEmail,
  findUserById,
  listUsers,
  replaceUserRoles,
  recordAuditLog,
  revokeToken,
  isTokenRevoked,
  pruneExpiredTokens,
  createEmailVerificationToken,
  findEmailVerificationToken,
  markVerificationTokenUsed,
  deleteVerificationTokensForUser,
  markEmailVerified,
} = require('./auth.repository');
const { sendVerificationEmail, sendWelcomeEmail } = require('./email.service');
const { ROLES, DEFAULT_ROLE } = require('./constants');
const { sortRolesByPriority, determinePrimaryRole } = require('./role.helpers');
const {
  getProfile: getVolunteerProfileForUser,
} = require('../volunteer-journey/volunteerJourney.service');
const { findSponsorProfile } = require('../sponsors/sponsor.repository');

const config = require('../../config');

function parseSupportEmails(raw) {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const emails = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (!emails.length) {
    return null;
  }

  return emails.join(', ');
}

const CONFIGURED_SUPPORT_EMAIL = parseSupportEmails(config.admin?.email);

const SALT_ROUNDS = config.bcrypt.saltRounds;
const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRY = config.jwt.expiry;
const JWT_ISSUER = config.jwt.issuer;
const EMAIL_VERIFICATION_TOKEN_TTL_MINUTES = 60 * 24;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured before using auth.service');
}

function toPublicUser(user) {
  if (!user) return null;
  const roles = Array.isArray(user.roles) && user.roles.length
    ? sortRolesByPriority(user.roles)
    : sortRolesByPriority(user.role ? [user.role] : []);
  const primaryRole = determinePrimaryRole(roles, user.role || DEFAULT_ROLE);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: primaryRole || null,
    roles,
    isActive: user.is_active !== false,
    emailVerified: Boolean(user.email_verified_at),
    emailVerifiedAt:
      user.email_verified_at instanceof Date
        ? user.email_verified_at.toISOString()
        : user.email_verified_at || null,
    createdAt:
      user.created_at instanceof Date ? user.created_at.toISOString() : user.created_at,
  };
}

async function toPublicUserWithProfile(user) {
  const baseUser = toPublicUser(user);
  if (!baseUser || !user?.id) {
    return baseUser;
  }
  const [volunteerProfile, sponsorProfile] = await Promise.all([
    getVolunteerProfileForUser(user.id),
    findSponsorProfile(user.id).catch(() => null),
  ]);
  return {
    ...baseUser,
    profile: volunteerProfile,
    sponsorProfile,
  };
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const PUBLIC_SIGNUP_ROLES = ROLES.filter((role) => role !== 'ADMIN');

function normalizeSignupRoles(roles) {
  if (!Array.isArray(roles)) {
    return [];
  }
  const unique = Array.from(
    new Set(
      roles
        .map((role) => (typeof role === 'string' ? role.trim().toUpperCase() : ''))
        .filter((role) => PUBLIC_SIGNUP_ROLES.includes(role))
    )
  );
  return sortRolesByPriority(unique);
}

function toAuditUserSnapshot(user) {
  if (!user) {
    return null;
  }
  const roles = Array.isArray(user.roles) && user.roles.length ? sortRolesByPriority(user.roles) : undefined;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || null,
    roles: roles || undefined,
    isActive: user.is_active !== false,
    emailVerified: Boolean(user.email_verified_at),
  };
}

async function signup({ name, email, password, roles }) {
  if (!name || !email || !password) {
    throw createHttpError(400, 'Name, email, and password are required');
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    throw createHttpError(409, 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const normalizedRoles = normalizeSignupRoles(roles);
  const user = await createUser({
    name,
    email,
    passwordHash,
    roles: normalizedRoles.length ? normalizedRoles : [DEFAULT_ROLE],
  });

  await recordAuditLog({
    actorId: user.id,
    action: 'auth.signup',
    entityType: 'user',
    entityId: user.id,
    after: toAuditUserSnapshot(user),
  });

  let verification;
  try {
    verification = await createEmailVerificationToken({
      userId: user.id,
      expiresInMinutes: EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
    });
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: verification.token,
      expiresAt: verification.expires_at,
    });
  } catch (error) {
    logger.warn('Failed to send verification email', {
      error: error.message,
      email: user.email,
    });
  }

  return {
    user: await toPublicUserWithProfile(user),
    requiresEmailVerification: true,
    verification: verification
      ? {
          expiresAt:
            verification.expires_at instanceof Date
              ? verification.expires_at.toISOString()
              : verification.expires_at,
        }
      : null,
    message: 'Check your inbox to verify your email before logging in.',
    supportEmail: CONFIGURED_SUPPORT_EMAIL,
  };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw createHttpError(400, 'Email and password are required');
  }

  const user = await findUserByEmail(email);
  if (!user) {
    await recordAuditLog({
      actorId: null,
      action: 'auth.login.failure',
      entityType: 'user',
      entityId: null,
      after: { email, success: false, reason: 'user_not_found' },
    });
    throw createHttpError(401, 'Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    await recordAuditLog({
      actorId: user.id,
      action: 'auth.login.failure',
      entityType: 'user',
      entityId: user.id,
      before: toAuditUserSnapshot(user),
      after: { email: user.email, success: false, reason: 'invalid_password' },
    });
    throw createHttpError(401, 'Invalid credentials');
  }

  if (user.is_active === false) {
    await recordAuditLog({
      actorId: user.id,
      action: 'auth.login.failure',
      entityType: 'user',
      entityId: user.id,
      before: toAuditUserSnapshot(user),
      after: { email: user.email, success: false, reason: 'account_inactive' },
    });
    throw createHttpError(403, 'This account has been deactivated. Reach out to the admin team to restore access.');
  }

  if (!user.email_verified_at) {
    await recordAuditLog({
      actorId: user.id,
      action: 'auth.login.failure',
      entityType: 'user',
      entityId: user.id,
      before: toAuditUserSnapshot(user),
      after: { email: user.email, success: false, reason: 'email_not_verified' },
    });
    throw createHttpError(403, 'Please verify your email before logging in.');
  }

  await recordAuditLog({
    actorId: user.id,
    action: 'auth.login.success',
    entityType: 'user',
    entityId: user.id,
    before: toAuditUserSnapshot(user),
    after: { email: user.email, success: true, roles: user.roles || [] },
  });

  const tokenBundle = await issueTokenBundle(user);
  return { user: await toPublicUserWithProfile(user), ...tokenBundle };
}

async function verifyEmail({ token }) {
  if (!token) {
    throw createHttpError(400, 'Verification token is required');
  }

  const tokenRecord = await findEmailVerificationToken(token);
  if (!tokenRecord) {
    throw createHttpError(400, 'Invalid verification token');
  }

  if (tokenRecord.used_at) {
    throw createHttpError(400, 'This verification link has already been used');
  }

  if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
    throw createHttpError(400, 'This verification link has expired');
  }

  const user = await findUserById(tokenRecord.user_id);
  if (!user) {
    await markVerificationTokenUsed({ tokenId: tokenRecord.id });
    throw createHttpError(404, 'Account no longer exists');
  }

  if (user.email_verified_at) {
    await markVerificationTokenUsed({ tokenId: tokenRecord.id });
    await deleteVerificationTokensForUser({ userId: user.id, exceptTokenId: tokenRecord.id });
    return {
      user: await toPublicUserWithProfile(user),
      alreadyVerified: true,
      message: 'Email already verified. You can log in now.',
    };
  }

  const updatedUser = await markEmailVerified({ userId: user.id });
  await markVerificationTokenUsed({ tokenId: tokenRecord.id });
  await deleteVerificationTokensForUser({ userId: user.id, exceptTokenId: tokenRecord.id });

  await recordAuditLog({
    actorId: updatedUser.id,
    action: 'auth.email.verify',
    entityType: 'user',
    entityId: updatedUser.id,
    before: toAuditUserSnapshot(user),
    after: toAuditUserSnapshot(updatedUser),
  });

  try {
    await sendWelcomeEmail({ to: updatedUser.email, name: updatedUser.name });
  } catch (error) {
    logger.warn('Failed to send welcome email after verification', {
      error: error.message,
      email: updatedUser.email,
    });
  }

  return {
    user: await toPublicUserWithProfile(updatedUser),
    message: 'Your email has been verified. You can now log in.',
  };
}

async function logout({ jti, expiresAt, actorId }) {
  if (!jti || !expiresAt) {
    throw createHttpError(400, 'Token details are required for logout');
  }

  await revokeToken({ jti, expiresAt });
  await pruneExpiredTokens();

  await recordAuditLog({
    actorId: actorId || null,
    action: 'auth.logout',
    entityType: 'session',
    entityId: null,
    after: { jti, revokedAt: new Date().toISOString() },
  });
}

async function issueTokenBundle(user) {
  const jti = randomUUID();
  const payload = {
    sub: user.id,
    role: user.role,
    roles: Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [],
    name: user.name,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: JWT_ISSUER,
    jwtid: jti,
  });

  const decoded = jwt.decode(token);
  return {
    token,
    expiresAt: decoded && decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
    jti,
  };
}

async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER });
    const revoked = await isTokenRevoked(decoded.jti);
    if (revoked) {
      throw createHttpError(401, 'Token has been revoked');
    }

    const user = await findUserById(decoded.sub);
    if (!user) {
      throw createHttpError(401, 'User no longer exists');
    }

    return {
      user: toPublicUser(user),
      claims: decoded,
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    throw createHttpError(401, message);
  }
}

async function getProfile(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw createHttpError(404, 'User not found');
  }
  return toPublicUserWithProfile(user);
}

async function listAllUsers() {
  const users = await listUsers();
  return users.map(toPublicUser);
}

function normalizeRolesInput(input) {
  if (!input) {
    return [];
  }
  if (Array.isArray(input)) {
    return input;
  }
  if (typeof input === 'string') {
    return [input];
  }
  return [];
}

async function assignRole({ actorId, userId, roles }) {
  const normalizedRoles = Array.from(
    new Set(
      normalizeRolesInput(roles)
        .map((role) => (typeof role === 'string' ? role.trim().toUpperCase() : ''))
        .filter((role) => ROLES.includes(role))
    )
  );

  const orderedRoles = sortRolesByPriority(normalizedRoles);

  if (!orderedRoles.length) {
    throw createHttpError(400, 'At least one valid role is required');
  }

  const existing = await findUserById(userId);
  if (!existing) {
    throw createHttpError(404, 'User not found');
  }

  const user = await replaceUserRoles({ userId, roles: orderedRoles });

  await recordAuditLog({
    actorId,
    action: 'auth.role.change',
    entityType: 'user',
    entityId: user.id,
    before: toAuditUserSnapshot(existing),
    after: toAuditUserSnapshot(user),
  });

  return toPublicUserWithProfile(user);
}

module.exports = {
  signup,
  login,
  logout,
  verifyToken,
  getProfile,
  listAllUsers,
  assignRole,
  verifyEmail,
  ROLES,
};
