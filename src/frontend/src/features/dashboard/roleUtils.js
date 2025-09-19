const ROLE_PRIORITY = ['ADMIN', 'EVENT_MANAGER', 'VOLUNTEER', 'SPONSOR'];

function normalizeRoleValue(role) {
  if (typeof role !== 'string') {
    return '';
  }
  const normalized = role.trim().toUpperCase();
  return ROLE_PRIORITY.includes(normalized) ? normalized : '';
}

export function normalizeRoles(roles, fallbackRole) {
  const candidates = [];
  if (Array.isArray(roles)) {
    candidates.push(...roles);
  }
  if (fallbackRole) {
    candidates.push(fallbackRole);
  }
  const unique = Array.from(
    new Set(
      candidates
        .map(normalizeRoleValue)
        .filter(Boolean)
    )
  );
  return unique.sort((a, b) => ROLE_PRIORITY.indexOf(a) - ROLE_PRIORITY.indexOf(b));
}

export function determinePrimaryRole(roles, fallbackRole = 'VOLUNTEER') {
  const normalized = normalizeRoles(roles, fallbackRole);
  if (normalized.length) {
    return normalized[0];
  }
  const fallbackNormalized = normalizeRoleValue(fallbackRole);
  return fallbackNormalized || 'VOLUNTEER';
}

export { ROLE_PRIORITY };
