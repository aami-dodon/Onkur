import { useCallback } from 'react';
import { apiRequest, API_BASE } from '../../lib/apiClient';
import { useAuth } from '../auth/AuthContext';

function buildUrl(path, params = {}) {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    url.searchParams.set(key, value);
  });
  return url.toString();
}

export default function useAdminConsole() {
  const { token } = useAuth();

  const ensureToken = useCallback(() => {
    if (!token) {
      const error = new Error('Not authenticated');
      error.status = 401;
      throw error;
    }
  }, [token]);

  const loadModerationQueue = useCallback(
    async (type) => {
      ensureToken();
      const query = type ? `?type=${encodeURIComponent(type)}` : '';
      return apiRequest(`/api/admin/moderation${query}`, { token });
    },
    [ensureToken, token]
  );

  const approveItem = useCallback(
    async ({ entityType, entityId }) => {
      ensureToken();
      if (!entityType || !entityId) {
        throw new Error('entityType and entityId are required');
      }
      const path = `/api/admin/approve/${encodeURIComponent(entityType)}/${entityId}`;
      return apiRequest(path, { method: 'POST', token });
    },
    [ensureToken, token]
  );

  const rejectItem = useCallback(
    async ({ entityType, entityId, reason = null }) => {
      ensureToken();
      if (!entityType || !entityId) {
        throw new Error('entityType and entityId are required');
      }
      const path = `/api/admin/reject/${encodeURIComponent(entityType)}/${entityId}`;
      return apiRequest(path, { method: 'POST', token, body: { reason } });
    },
    [ensureToken, token]
  );

  const fetchOverview = useCallback(async () => {
    ensureToken();
    return apiRequest('/api/admin/reports/overview', { token });
  }, [ensureToken, token]);

  const updateUser = useCallback(
    async ({ userId, roles, isActive, reason = null }) => {
      ensureToken();
      const body = {};
      if (Array.isArray(roles)) {
        body.roles = roles;
      }
      if (typeof isActive === 'boolean') {
        body.isActive = isActive;
      }
      if (reason) {
        body.reason = reason;
      }
      return apiRequest(`/api/admin/users/${userId}`, { method: 'PATCH', token, body });
    },
    [ensureToken, token]
  );

  const downloadExport = useCallback(
    async ({ entity, format = 'csv' }) => {
      ensureToken();
      const url = buildUrl('/api/admin/export', { entity, format });
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const message = await response.text();
        const error = new Error(message || 'Failed to export data');
        error.status = response.status;
        throw error;
      }
      const disposition = response.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = filenameMatch ? filenameMatch[1] : `${entity}-export.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
      const blob = await response.blob();
      return { filename, blob };
    },
    [ensureToken, token]
  );

  return {
    loadModerationQueue,
    approveItem,
    rejectItem,
    fetchOverview,
    updateUser,
    downloadExport,
  };
}
