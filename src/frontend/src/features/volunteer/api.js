import { apiRequest } from '../../lib/apiClient';

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.category) {
    params.set('category', filters.category);
  }
  if (filters.location) {
    params.set('location', filters.location);
  }
  if (filters.theme) {
    params.set('theme', filters.theme);
  }
  if (filters.date) {
    params.set('date', filters.date);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function fetchVolunteerProfile(token) {
  return apiRequest('/api/me/profile', { token });
}

export function updateVolunteerProfile(token, payload) {
  return apiRequest('/api/me/profile', { method: 'PUT', token, body: payload });
}

export function fetchProfileLookups(token) {
  return apiRequest('/api/profile/lookups', { token });
}

export function fetchCitiesForState(token, stateCode) {
  const normalized = stateCode ? String(stateCode).trim() : '';
  if (!normalized) {
    return Promise.resolve({ state: null, cities: [] });
  }
  return apiRequest(`/api/profile/states/${encodeURIComponent(normalized)}/cities`, { token });
}

export function fetchEvents(token, filters = {}) {
  return apiRequest(`/api/events${buildQuery(filters)}`, { token });
}

export function signupForEvent(token, eventId) {
  return apiRequest(`/api/events/${eventId}/signup`, { method: 'POST', token });
}

export function leaveEvent(token, eventId) {
  return apiRequest(`/api/events/${eventId}/signup`, { method: 'DELETE', token });
}

export function fetchMySignups(token) {
  return apiRequest('/api/me/signups', { token });
}

export function logVolunteerHours(token, eventId, payload) {
  return apiRequest(`/api/events/${eventId}/hours`, { method: 'POST', token, body: payload });
}

export function fetchVolunteerHours(token) {
  return apiRequest('/api/me/hours', { token });
}

export function fetchVolunteerDashboard(token) {
  return apiRequest('/api/me/dashboard', { token });
}
