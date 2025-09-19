import { API_BASE } from '../../lib/apiClient';

function buildHeaders(token, extra = {}) {
  const headers = { ...extra };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const message = isJson && payload && payload.error ? payload.error : 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export async function fetchEventGallery(eventId, { page = 1, pageSize = 12, token } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);
  const response = await fetch(`${API_BASE}/api/events/${eventId}/media?${params.toString()}`, {
    headers: buildHeaders(token),
  });
  return handleResponse(response);
}

export async function fetchGalleryEvents({ page = 1, pageSize = 12 } = {}) {
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);
  const response = await fetch(`${API_BASE}/api/media/events?${params.toString()}`);
  return handleResponse(response);
}

export async function uploadEventMedia(eventId, { file, caption, tags }, token) {
  if (!token) {
    throw new Error('Authentication required');
  }
  const formData = new FormData();
  formData.append('file', file);
  if (caption) {
    formData.append('caption', caption);
  }
  if (tags && tags.length) {
    formData.append('tags', JSON.stringify(tags));
  }
  const response = await fetch(`${API_BASE}/api/events/${eventId}/media`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: formData,
  });
  return handleResponse(response);
}

export async function fetchTagOptions(eventId, token) {
  if (!token) {
    throw new Error('Authentication required');
  }
  const response = await fetch(`${API_BASE}/api/events/${eventId}/media/tags`, {
    headers: buildHeaders(token),
  });
  return handleResponse(response);
}

export async function fetchModerationQueue({ page = 1, pageSize = 20 } = {}, token) {
  if (!token) {
    throw new Error('Authentication required');
  }
  const params = new URLSearchParams();
  if (page) params.set('page', page);
  if (pageSize) params.set('pageSize', pageSize);
  const response = await fetch(`${API_BASE}/api/media/moderation?${params.toString()}`, {
    headers: buildHeaders(token),
  });
  return handleResponse(response);
}

export async function approveMedia(mediaId, token) {
  if (!token) {
    throw new Error('Authentication required');
  }
  const response = await fetch(`${API_BASE}/api/media/${mediaId}/approve`, {
    method: 'POST',
    headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({}),
  });
  return handleResponse(response);
}

export async function rejectMedia(mediaId, reason, token) {
  if (!token) {
    throw new Error('Authentication required');
  }
  const response = await fetch(`${API_BASE}/api/media/${mediaId}/reject`, {
    method: 'POST',
    headers: buildHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason }),
  });
  return handleResponse(response);
}
