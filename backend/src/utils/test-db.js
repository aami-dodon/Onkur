const pool = require('../features/common/db');
const logger = require('./logger');

(async () => {
  try {
    const client = await pool.connect();
    logger.info('✅ Connected to Postgres');
    const result = await client.query('SELECT NOW() AS time');
    logger.info('Current Postgres time', { time: result.rows[0].time });
    client.release();
    process.exit(0);
  } catch (err) {
    logger.error('❌ Postgres connection failed', { error: err.message });
    process.exit(1);
  }
})();
