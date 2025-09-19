const minioClient = require('../features/common/minio');
const config = require('../config');
const logger = require('./logger');

(async () => {
  try {
    if (!config.minio.bucket) {
      logger.warn('MINIO_BUCKET is not configured. Skipping bucket existence check.');
      process.exit(0);
      return;
    }

    const exists = await minioClient.bucketExists(config.minio.bucket);
    logger.info(`✅ MinIO bucket '${config.minio.bucket}' exists`, { exists });
    process.exit(0);
  } catch (err) {
    logger.error('❌ MinIO test failed', { error: err.message });
    process.exit(1);
  }
})();
