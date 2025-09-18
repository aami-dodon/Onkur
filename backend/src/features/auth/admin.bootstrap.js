const bcrypt = require("bcryptjs");
const config = require("../../config");
const logger = require("../../utils/logger");
const {
  createUser,
  findUserByEmail,
  replaceUserRoles,
  markEmailVerified,
  recordAuditLog,
} = require("./auth.repository");

const ADMIN_ROLE = "ADMIN";

function normalizeConfigValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function ensureAdminUser() {
  const configuredName = normalizeConfigValue(config.admin?.name);
  const configuredEmail = normalizeConfigValue(config.admin?.email).toLowerCase();
  const configuredPassword = config.admin?.password || "";

  if (!configuredName || !configuredEmail || !configuredPassword) {
    logger.info("Admin bootstrap skipped: ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set");
    return;
  }

  const existing = await findUserByEmail(configuredEmail);
  if (existing) {
    const existingRoles = Array.isArray(existing.roles) && existing.roles.length
      ? existing.roles
      : existing.role
      ? [existing.role]
      : [];

    const rolesWithoutAdmin = existingRoles.filter((role) => role !== ADMIN_ROLE);
    const desiredRoles = [ADMIN_ROLE, ...rolesWithoutAdmin];

    const needsRoleUpdate =
      existing.role !== ADMIN_ROLE || existingRoles.length !== desiredRoles.length ||
      desiredRoles.some((role, index) => existingRoles[index] !== role);

    if (needsRoleUpdate) {
      const updatedUser = await replaceUserRoles({ userId: existing.id, roles: desiredRoles });
      await recordAuditLog({
        actorId: existing.id,
        action: "auth.bootstrap.admin.promote",
        metadata: { email: existing.email, roles: updatedUser?.roles || desiredRoles },
      });
      logger.info("Admin bootstrap: ensured existing user has ADMIN role", { email: configuredEmail });
    } else {
      logger.info("Admin bootstrap: existing admin user detected", { email: configuredEmail });
    }

    if (!existing.email_verified_at) {
      await markEmailVerified({ userId: existing.id });
    }

    return;
  }

  const passwordHash = await bcrypt.hash(configuredPassword, config.bcrypt.saltRounds);
  const adminUser = await createUser({
    name: configuredName,
    email: configuredEmail,
    passwordHash,
    roles: [ADMIN_ROLE],
  });

  await markEmailVerified({ userId: adminUser.id });

  await recordAuditLog({
    actorId: adminUser.id,
    action: "auth.bootstrap.admin.created",
    metadata: { email: adminUser.email },
  });

  logger.info("Admin bootstrap: created default admin user", { email: configuredEmail });
}

module.exports = {
  ensureAdminUser,
};
