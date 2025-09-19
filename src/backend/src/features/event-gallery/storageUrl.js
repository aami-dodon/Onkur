const config = require('../../config');

function buildStorageUrl({ key }) {
  if (!key) {
    return null;
  }

  const { bucket, endPoint, port, useSSL } = config.minio || {};
  if (!bucket || !endPoint) {
    return null;
  }

  const protocol = useSSL ? 'https' : 'http';
  const portPart = port && ![80, 443].includes(Number(port)) ? `:${port}` : '';

  return `${protocol}://${endPoint}${portPart}/${bucket}/${key}`;
}

function resolveMediaUrl({ storageKey, persistedUrl }) {
  if (!storageKey || storageKey.startsWith('inline://')) {
    return persistedUrl || null;
  }

  const generated = buildStorageUrl({ key: storageKey });
  if (generated) {
    return generated;
  }

  return persistedUrl || null;
}

module.exports = {
  buildStorageUrl,
  resolveMediaUrl,
};
