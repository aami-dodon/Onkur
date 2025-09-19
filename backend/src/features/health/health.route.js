const express = require('express');
const router = express.Router();
const pool = require('../common/db');
const minioClient = require('../common/minio');
const config = require('../../config');
const logger = require('../../utils/logger');

router.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as time');

    let bucketExists = null;
    if (config.minio.bucket) {
      bucketExists = await minioClient.bucketExists(config.minio.bucket);
    }

    logger.info('Health check successful', {
      dbTime: dbRes.rows[0].time,
      minioBucket: bucketExists,
    });

    res.json({
      status: 'ok',
      dbTime: dbRes.rows[0].time,
      minioBucket: bucketExists,
    });
  } catch (err) {
    logger.error('Health check failed', { error: err.message });
    res.status(500).json({ error: 'Connection failed', details: err.message });
  }
});

module.exports = router;
