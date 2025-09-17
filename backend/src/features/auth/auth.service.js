const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const logger = require('../../utils/logger');
const {
  createUser,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUserRole,
  recordAuditLog,
  revokeToken,
  isTokenRevoked,
  pruneExpiredTokens,
} = require('./auth.repository');
const { sendWelcomeEmail } = require('./email.service');
const { ROLES, DEFAULT_ROLE } = require('./constants');

const config = require('../../config');

const SALT_ROUNDS = config.bcrypt.saltRounds;
const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRY = config.jwt.expiry;
const JWT_ISSUER = config.jwt.issuer;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured before using auth.service');
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt:
      user.created_at instanceof Date ? user.created_at.toISOString() : user.created_at,
  };
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function signup({ name, email, password }) {
  if (!name || !email || !password) {
    throw createHttpError(400, 'Name, email, and password are required');
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    throw createHttpError(409, 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({
    name,
    email,
    passwordHash,
    role: DEFAULT_ROLE,
  });

  await recordAuditLog({
    actorId: user.id,
    action: 'auth.signup',
    metadata: { email: user.email, role: user.role },
  });

  try {
    await sendWelcomeEmail({ to: user.email, name: user.name });
  } catch (error) {
    logger.warn('Failed to enqueue welcome email', { error: error.message, email: user.email });
  }

  const tokenBundle = await issueTokenBundle(user);
  return { user: toPublicUser(user), ...tokenBundle };
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
      metadata: { email, reason: 'user_not_found' },
    });
    throw createHttpError(401, 'Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    await recordAuditLog({
      actorId: user.id,
      action: 'auth.login.failure',
      metadata: { email, reason: 'invalid_password' },
    });
    throw createHttpError(401, 'Invalid credentials');
  }

  await recordAuditLog({
    actorId: user.id,
    action: 'auth.login.success',
    metadata: { email: user.email, role: user.role },
  });

  const tokenBundle = await issueTokenBundle(user);
  return { user: toPublicUser(user), ...tokenBundle };
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
    metadata: { jti },
  });
}

async function issueTokenBundle(user) {
  const jti = randomUUID();
  const payload = {
    sub: user.id,
    role: user.role,
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
  return toPublicUser(user);
}

async function listAllUsers() {
  const users = await listUsers();
  return users.map(toPublicUser);
}

async function assignRole({ actorId, userId, role }) {
  if (!ROLES.includes(role)) {
    throw createHttpError(400, 'Invalid role supplied');
  }
  const user = await updateUserRole({ userId, role });
  if (!user) {
    throw createHttpError(404, 'User not found');
  }

  await recordAuditLog({
    actorId,
    action: 'auth.role.change',
    metadata: { userId: user.id, role },
  });

  return toPublicUser(user);
}

module.exports = {
  signup,
  login,
  logout,
  verifyToken,
  getProfile,
  listAllUsers,
  assignRole,
  ROLES,
};
