import { apiRequest, API_BASE } from '../../lib/apiClient';

export async function fetchModerationQueue({ token, type }) {
  const params = type ? `?type=${encodeURIComponent(type)}` : '';
  return apiRequest(`/api/admin/moderation${params}`, { token });
}

export async function approveEntity({ token, entityType, entityId, note }) {
  return apiRequest(`/api/admin/approve/${entityType}/${entityId}`, {
    method: 'POST',
    token,
    body: note ? { note } : undefined,
  });
}

export async function rejectEntity({ token, entityType, entityId, note }) {
  return apiRequest(`/api/admin/reject/${entityType}/${entityId}`, {
    method: 'POST',
    token,
    body: note ? { note } : undefined,
  });
}

export async function patchUser({ token, userId, roles, isActive }) {
  const body = {};
  if (roles !== undefined) {
    body.roles = roles;
  }
  if (typeof isActive === 'boolean') {
    body.isActive = isActive;
  }
  return apiRequest(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    token,
    body,
  });
}

export async function fetchOverview({ token }) {
  return apiRequest('/api/admin/reports/overview', { token });
}

export async function exportAdminData({ token, entity, format }) {
  const url = new URL(`${API_BASE}/api/admin/export`);
  if (entity) {
    url.searchParams.set('entity', entity);
  }
  if (format) {
    url.searchParams.set('format', format);
  }
  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to export data');
  }
  const disposition = response.headers.get('content-disposition');
  let filename = '';
  if (disposition) {
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    if (match?.[1]) {
      filename = match[1];
    }
  }
  const blob = await response.blob();
  return { blob, filename };
}
