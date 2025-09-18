export function getConfiguredSupportEmail() {
  const raw = import.meta.env.VITE_ADMIN_EMAIL;

  if (!raw) {
    return '';
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join(', ');
}
