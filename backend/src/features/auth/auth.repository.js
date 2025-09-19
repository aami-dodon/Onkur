const { randomUUID } = require('crypto');
const pool = require('../common/db');
const logger = require('../../utils/logger');
const { ROLES, DEFAULT_ROLE } = require('./constants');
const { sortRolesByPriority, determinePrimaryRole, buildRolePriorityCase } = require('./role.helpers');

const roleCheckArray = ROLES.map((role) => `'${role}'`).join(', ');
const roleOrderCase = buildRolePriorityCase('role');

const schemaPromise = (async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      email_normalized TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role = ANY(ARRAY[${roleCheckArray}]::TEXT[])),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      deactivated_at TIMESTAMPTZ NULL,
      deactivated_reason TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      email_verified_at TIMESTAMPTZ NULL
    )
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ NULL
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await pool.query(`
    UPDATE users
    SET is_active = TRUE
    WHERE is_active IS NULL
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ NULL
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deactivated_reason TEXT NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role = ANY(ARRAY[${roleCheckArray}]::TEXT[])),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, role)
    )
  `);

  await pool.query(`
    INSERT INTO user_roles (user_id, role)
    SELECT id, role
    FROM users
    ON CONFLICT DO NOTHING
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY,
      actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NULL,
      entity_id TEXT NULL,
      before JSONB NULL,
      after JSONB NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS entity_type TEXT NULL
  `);

  await pool.query(`
    ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS entity_id TEXT NULL
  `);

  await pool.query(`
    ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS before JSONB NULL
  `);

  await pool.query(`
    ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS after JSONB NULL
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
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id)
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

function sanitizeRoles(roles = []) {
  if (!Array.isArray(roles)) {
    return [];
  }
  return sortRolesByPriority(roles);
}

async function attachRoles(user) {
  if (!user) {
    return null;
  }
  const rolesResult = await pool.query(
    `SELECT role FROM user_roles WHERE user_id = $1 ORDER BY ${roleOrderCase}, role ASC`,
    [user.id]
  );
  return {
    ...user,
    roles: rolesResult.rows.map((row) => row.role),
  };
}

async function createUser({ name, email, passwordHash, roles }) {
  await ensureSchema();
  const id = randomUUID();
  const normalizedEmail = email.toLowerCase();
  const sanitizedRoles = sanitizeRoles(roles);
  const primaryRole = determinePrimaryRole(sanitizedRoles, DEFAULT_ROLE);
  const roleSet = sanitizedRoles.length ? sanitizedRoles : [primaryRole];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
        INSERT INTO users (
          id,
          name,
          email,
          email_normalized,
          password_hash,
          role,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        RETURNING
          id,
          name,
          email,
          role,
          created_at,
          updated_at,
          email_verified_at,
          email_normalized,
          password_hash,
          is_active,
          deactivated_at,
          deactivated_reason
      `,
      [id, name, email, normalizedEmail, passwordHash, primaryRole]
    );

    await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [id]);
    await insertUserRoles(client, id, roleSet);

    await client.query('COMMIT');

    const user = result.rows[0];
    return {
      ...user,
      roles: roleSet,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findUserByEmail(email) {
  await ensureSchema();
  const normalizedEmail = email.toLowerCase();
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        email_normalized,
        password_hash,
        role,
        created_at,
        updated_at,
        email_verified_at,
        is_active,
        deactivated_at,
        deactivated_reason
      FROM users
      WHERE email_normalized = $1
    `,
    [normalizedEmail]
  );
  const user = result.rows[0] || null;
  if (!user) {
    return null;
  }
  return attachRoles(user);
}

async function findUserById(id) {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        email_normalized,
        password_hash,
        role,
        created_at,
        updated_at,
        email_verified_at,
        is_active,
        deactivated_at,
        deactivated_reason
      FROM users
      WHERE id = $1
    `,
    [id]
  );
  const user = result.rows[0] || null;
  if (!user) {
    return null;
  }
  return attachRoles(user);
}

async function listUsers() {
  await ensureSchema();
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        role,
        created_at,
        updated_at,
        email_verified_at,
        is_active,
        deactivated_at,
        deactivated_reason
      FROM users
      ORDER BY created_at DESC
    `
  );
  const users = result.rows;
  if (users.length === 0) {
    return [];
  }
  const ids = users.map((user) => user.id);
  const rolesResult = await pool.query(
    `SELECT user_id, role FROM user_roles WHERE user_id = ANY($1::UUID[]) ORDER BY ${roleOrderCase}, role ASC`,
    [ids]
  );
  const rolesByUser = rolesResult.rows.reduce((acc, row) => {
    if (!acc[row.user_id]) {
      acc[row.user_id] = [];
    }
    acc[row.user_id].push(row.role);
    return acc;
  }, {});

  return users.map((user) => ({
    ...user,
    roles: rolesByUser[user.id] || [],
  }));
}

async function insertUserRoles(client, userId, roleSet) {
  if (!roleSet.length) {
    return;
  }
  const placeholders = roleSet.map((_, index) => `($1, $${index + 2})`).join(', ');
  const values = [userId, ...roleSet];
  await client.query(
    `
      INSERT INTO user_roles (user_id, role)
      VALUES ${placeholders}
      ON CONFLICT (user_id, role) DO NOTHING
    `,
    values
  );
}

async function replaceUserRoles({ userId, roles }) {
  await ensureSchema();
  const sanitizedRoles = sanitizeRoles(roles);
  const primaryRole = determinePrimaryRole(sanitizedRoles, DEFAULT_ROLE);
  const roleSet = sanitizedRoles.length ? sanitizedRoles : [primaryRole];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updateResult = await client.query(
      `
        UPDATE users
        SET role = $2
        WHERE id = $1
        RETURNING
          id,
          name,
          email,
          role,
          created_at,
          updated_at,
          email_verified_at,
          email_normalized,
          password_hash,
          is_active,
          deactivated_at,
          deactivated_reason
      `,
      [userId, primaryRole]
    );

    const user = updateResult.rows[0];
    if (!user) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
    await insertUserRoles(client, userId, roleSet);

    await client.query('COMMIT');

    return {
      ...user,
      roles: roleSet,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateUserActiveState({ userId, isActive, reason = null }) {
  await ensureSchema();
  const activeFlag = Boolean(isActive);
  const normalizedReason = reason ? String(reason).trim() || null : null;
  const result = await pool.query(
    `
      UPDATE users
      SET
        is_active = $2,
        deactivated_at = CASE WHEN $2 = FALSE THEN NOW() ELSE NULL END,
        deactivated_reason = CASE WHEN $2 = FALSE THEN $3 ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1
      RETURNING
        id,
        name,
        email,
        role,
        created_at,
        updated_at,
        email_verified_at,
        email_normalized,
        password_hash,
        is_active,
        deactivated_at,
        deactivated_reason
    `,
    [userId, activeFlag, normalizedReason]
  );
  const user = result.rows[0] || null;
  if (!user) {
    return null;
  }
  return attachRoles(user);
}

async function recordAuditLog({
  actorId = null,
  action,
  entityType = null,
  entityId = null,
  before = null,
  after = null,
  metadata = {},
}) {
  await ensureSchema();
  const id = randomUUID();
  const metadataJson = JSON.stringify(metadata || {});
  const beforeJson = before === undefined || before === null ? null : JSON.stringify(before);
  const afterJson = after === undefined || after === null ? null : JSON.stringify(after);
  await pool.query(
    `
      INSERT INTO audit_logs (
        id,
        actor_id,
        action,
        entity_type,
        entity_id,
        before,
        after,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
    `,
    [id, actorId, action, entityType, entityId, beforeJson, afterJson, metadataJson]
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
  replaceUserRoles,
  recordAuditLog,
  updateUserActiveState,
  revokeToken,
  isTokenRevoked,
  pruneExpiredTokens,
  createEmailVerificationToken,
  findEmailVerificationToken,
  markVerificationTokenUsed,
  deleteVerificationTokensForUser,
  markEmailVerified,
};
