const logger = require('../../utils/logger');

async function sendWelcomeEmail({ to, name }) {
  logger.info('Queued welcome email', {
    to,
    subject: 'Welcome to Onkur',
    template: 'welcome',
    name,
  });
}

module.exports = {
  sendWelcomeEmail,
};
