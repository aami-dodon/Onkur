const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { ensureAdminUser } = require('./features/auth/admin.bootstrap');
const { seedVolunteerProfileLookups } = require('./features/volunteer-journey/profile.bootstrap');

async function startServer() {
  try {
    await ensureAdminUser();
  } catch (error) {
    logger.error('Admin bootstrap failed', { error: error.message });
  }

  try {
    await seedVolunteerProfileLookups();
  } catch (error) {
    logger.error('Volunteer profile lookup bootstrap failed', { error: error.message });
  }

  app.listen(config.port, () => {
    logger.info(`Backend running on port ${config.port}`);
  });
}

startServer();
