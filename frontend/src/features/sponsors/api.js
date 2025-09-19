import { apiRequest } from '../../lib/apiClient';

export function applyForSponsor(token, payload) {
  return apiRequest('/api/sponsors/apply', { method: 'POST', token, body: payload });
}

export function fetchSponsorProfile(token) {
  return apiRequest('/api/sponsors/me', { token });
}

export function updateSponsorProfile(token, payload) {
  return apiRequest('/api/sponsors/me', { method: 'PATCH', token, body: payload });
}

export function fetchSponsorSponsorships(token) {
  return apiRequest('/api/sponsors/me/sponsorships', { token });
}

export function fetchSponsorDashboard(token) {
  return apiRequest('/api/sponsors/me/dashboard', { token });
}

export function fetchSponsorReports(token) {
  return apiRequest('/api/sponsors/me/reports', { token });
}

export function pledgeEventSponsorship(token, eventId, payload) {
  return apiRequest(`/api/events/${eventId}/sponsor`, { method: 'POST', token, body: payload });
}
