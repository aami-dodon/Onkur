const { DEFAULT_ROLE, ROLES, ROLE_PRIORITY, ROLE_PRIORITY_RANK } = require('./constants');

function normalizeRoleValue(role) {
  if (typeof role !== 'string') {
    return '';
  }
  const trimmed = role.trim().toUpperCase();
  return ROLES.includes(trimmed) ? trimmed : '';
}

function sortRolesByPriority(roles = []) {
  return roles
    .map(normalizeRoleValue)
    .filter(Boolean)
    .filter((role, index, array) => array.indexOf(role) === index)
    .sort((a, b) => {
      const rankA = ROLE_PRIORITY_RANK[a];
      const rankB = ROLE_PRIORITY_RANK[b];
      return (rankA ?? Number.POSITIVE_INFINITY) - (rankB ?? Number.POSITIVE_INFINITY);
    });
}

function determinePrimaryRole(roles = [], fallback = DEFAULT_ROLE) {
  const normalized = sortRolesByPriority(Array.isArray(roles) ? roles : [roles]);
  if (normalized.length) {
    return normalized[0];
  }
  const fallbackNormalized = normalizeRoleValue(fallback);
  if (fallbackNormalized) {
    return fallbackNormalized;
  }
  return DEFAULT_ROLE;
}

function buildRolePriorityCase(column = 'role') {
  const clauses = ROLE_PRIORITY.map((role, index) => `WHEN '${role}' THEN ${index}`).join(' ');
  return `CASE ${column} ${clauses} ELSE ${ROLE_PRIORITY.length} END`;
}

module.exports = {
  sortRolesByPriority,
  determinePrimaryRole,
  buildRolePriorityCase,
};
