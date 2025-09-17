const { randomUUID } = require('crypto');
const pool = require('../common/db');
const logger = require('../../utils/logger');
const { ROLES } = require('./constants');

const roleCheckArray = ROLES.map((role) => `'${role}'`).join(', ');

const schemaPromise = (async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      email_normalized TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role = ANY(ARRAY[${roleCheckArray}]::TEXT[])),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      email_verified_at TIMESTAMPTZ NULL
    )
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY,
      actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      id UUID PRIMARY KEY,
      jti TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email_normalized ON users (email_normalized)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens (expires_at)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens (user_id)
  `);
})();

async function ensureSchema() {
  await schemaPromise;
}

async function createUser({ name, email, passwordHash, role }) {
  await ensureSchema();
  const id = randomUUID();
  const normalizedEmail = email.toLowerCase();

  const result = await pool.query(
    `
      INSERT INTO users (id, name, email, email_normalized, password_hash, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, created_at, email_verified_at
    `,
    [id, name, email, normalizedEmail, passwordHash, role]
  );

  return result.rows[0];
}

async function findUserByEmail(email) {
  await ensureSchema();
  const normalizedEmail = email.toLowerCase();
  const result = await pool.query(
    `SELECT id, name, email, email_normalized, password_hash, role, created_at, email_verified_at FROM users WHERE email_normalized = $1`,
    [normalizedEmail]
  );
  return result.rows[0] || null;
}

async function findUserById(id) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT id, name, email, email_normalized, password_hash, role, created_at, email_verified_at FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function listUsers() {
  await ensureSchema();
  const result = await pool.query(
    `SELECT id, name, email, role, created_at, email_verified_at FROM users ORDER BY created_at DESC`
  );
  return result.rows;
}

async function updateUserRole({ userId, role }) {
  await ensureSchema();
  const result = await pool.query(
    `
      UPDATE users
      SET role = $2
      WHERE id = $1
      RETURNING id, name, email, role, created_at, email_verified_at
    `,
    [userId, role]
  );
  return result.rows[0] || null;
}

async function recordAuditLog({ actorId = null, action, metadata = {} }) {
  await ensureSchema();
  const id = randomUUID();
  const metadataJson = JSON.stringify(metadata || {});
  await pool.query(
    `
      INSERT INTO audit_logs (id, actor_id, action, metadata)
      VALUES ($1, $2, $3, $4::jsonb)
    `,
    [id, actorId, action, metadataJson]
  );
}

async function revokeToken({ jti, expiresAt }) {
  await ensureSchema();
  const id = randomUUID();
  await pool.query(
    `
      INSERT INTO revoked_tokens (id, jti, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (jti) DO UPDATE SET expires_at = EXCLUDED.expires_at
    `,
    [id, jti, expiresAt]
  );
}

async function isTokenRevoked(jti) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT 1 FROM revoked_tokens WHERE jti = $1 AND expires_at >= NOW()` ,
    [jti]
  );
  return Boolean(result.rowCount);
}

async function pruneExpiredTokens() {
  await ensureSchema();
  try {
    await pool.query(`DELETE FROM revoked_tokens WHERE expires_at < NOW()`);
  } catch (error) {
    logger.warn('Failed to prune expired tokens', { error: error.message });
  }
}

async function createEmailVerificationToken({ userId, expiresInMinutes }) {
  await ensureSchema();
  const id = randomUUID();
  const token = randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await pool.query(`DELETE FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL`, [userId]);

  const result = await pool.query(
    `
      INSERT INTO email_verification_tokens (id, user_id, token, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, token, expires_at
    `,
    [id, userId, token, expiresAt]
  );

  return result.rows[0];
}

async function findEmailVerificationToken(token) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT id, user_id, token, expires_at, used_at
      FROM email_verification_tokens
      WHERE token = $1
    `,
    [token]
  );
  return result.rows[0] || null;
}

async function markVerificationTokenUsed({ tokenId }) {
  await ensureSchema();
  await pool.query(
    `
      UPDATE email_verification_tokens
      SET used_at = NOW()
      WHERE id = $1
    `,
    [tokenId]
  );
}

async function deleteVerificationTokensForUser({ userId, exceptTokenId = null }) {
  await ensureSchema();
  if (exceptTokenId) {
    await pool.query(
      `
        DELETE FROM email_verification_tokens
        WHERE user_id = $1 AND id <> $2
      `,
      [userId, exceptTokenId]
    );
  } else {
    await pool.query(
      `DELETE FROM email_verification_tokens WHERE user_id = $1`,
      [userId]
    );
  }
}

async function markEmailVerified({ userId }) {
  await ensureSchema();
  const result = await pool.query(
    `
      UPDATE users
      SET email_verified_at = COALESCE(email_verified_at, NOW())
      WHERE id = $1
      RETURNING id, name, email, email_normalized, password_hash, role, created_at, email_verified_at
    `,
    [userId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUserRole,
  recordAuditLog,
  revokeToken,
  isTokenRevoked,
  pruneExpiredTokens,
  createEmailVerificationToken,
  findEmailVerificationToken,
  markVerificationTokenUsed,
  deleteVerificationTokensForUser,
  markEmailVerified,
};
