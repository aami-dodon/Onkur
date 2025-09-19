const ROLES = ['VOLUNTEER', 'EVENT_MANAGER', 'SPONSOR', 'ADMIN'];

const DEFAULT_ROLE = 'VOLUNTEER';

const ROLE_PRIORITY = ['ADMIN', 'EVENT_MANAGER', 'VOLUNTEER', 'SPONSOR'];

const ROLE_PRIORITY_RANK = ROLE_PRIORITY.reduce((acc, role, index) => {
  acc[role] = index;
  return acc;
}, {});

module.exports = {
  ROLES,
  DEFAULT_ROLE,
  ROLE_PRIORITY,
  ROLE_PRIORITY_RANK,
};
