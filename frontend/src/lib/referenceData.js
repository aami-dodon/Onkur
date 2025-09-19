import { apiRequest } from './apiClient';

export function fetchReferenceData() {
  return apiRequest('/api/reference-data');
}

export function formatOptionLabel(options, value) {
  if (!value) return '';
  const option = options?.find?.((item) => item.value === value);
  if (option) {
    return option.label;
  }
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function toSlug(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
