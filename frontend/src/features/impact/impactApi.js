import { apiRequest, API_BASE } from '../../lib/apiClient';

export async function submitImpactStory({ token, eventId, title, body, mediaIds }) {
  if (!token) {
    throw new Error('Authentication required');
  }
  return apiRequest(`/api/events/${eventId}/stories`, {
    method: 'POST',
    token,
    body: {
      title,
      body,
      mediaIds,
    },
  });
}

export async function fetchImpactStories({ eventId, limit }) {
  const params = new URLSearchParams();
  if (limit) {
    params.set('limit', limit);
  }
  const query = params.toString();
  const suffix = query ? `?${query}` : '';
  const response = await fetch(`${API_BASE}/api/events/${eventId}/stories${suffix}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unable to load impact stories');
  }
  return response.json();
}

export async function fetchStoryModerationQueue({ token, page, pageSize, status }) {
  if (!token) {
    throw new Error('Authentication required');
  }
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);
  if (status) params.set('status', status);
  return apiRequest(`/api/impact/stories/moderation?${params.toString()}`, { token });
}

export async function approveImpactStory({ token, storyId }) {
  if (!token) {
    throw new Error('Authentication required');
  }
  return apiRequest(`/api/impact/stories/${storyId}/approve`, {
    method: 'POST',
    token,
    body: {},
  });
}

export async function rejectImpactStory({ token, storyId, reason }) {
  if (!token) {
    throw new Error('Authentication required');
  }
  return apiRequest(`/api/impact/stories/${storyId}/reject`, {
    method: 'POST',
    token,
    body: reason ? { reason } : {},
  });
}

export async function fetchImpactAnalytics({ token }) {
  if (!token) {
    throw new Error('Authentication required');
  }
  return apiRequest('/api/analytics/overview', { token });
}

export async function exportImpactAnalytics({ token }) {
  if (!token) {
    throw new Error('Authentication required');
  }
  const response = await fetch(`${API_BASE}/api/analytics/overview/report`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Unable to export analytics report');
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
