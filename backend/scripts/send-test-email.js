#!/usr/bin/env node

/*
 * Utility script to dispatch a sample Onkur email using the configured SMTP transport.
 * Usage: node scripts/send-test-email.js recipient@example.com
 * or set TEST_EMAIL_TO in your environment.
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables for standalone execution.
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../.env') });

const { sendTemplatedEmail } = require('../src/features/email/email.service');
const config = require('../src/config');

async function main() {
  const cliRecipient = process.argv[2];
  const recipient = cliRecipient || process.env.TEST_EMAIL_TO;

  if (!recipient) {
    console.error('Missing recipient. Pass an email address as an argument or set TEST_EMAIL_TO.');
    process.exit(1);
  }

  const appBaseUrl = (config.app && config.app.baseUrl) || 'https://onkur.org';

  try {
    const result = await sendTemplatedEmail({
      to: recipient,
      subject: 'Sample email delivery test',
      heading: 'Thanks for helping us take root',
      bodyLines: [
        'This is a test message to confirm that your SMTP credentials for Onkur are working as expected.',
        'If you received this email, no further action is required. Otherwise, please double-check your SMTP settings in the backend .env file.',
      ],
      cta: {
        label: 'Open the Onkur dashboard',
        url: `${appBaseUrl}/app`,
      },
      previewText: 'Confirm your Onkur email delivery setup with this quick test.',
    });

    if (!result) {
      console.log('Email transport is not configured. Check your SMTP environment variables.');
      process.exit(0);
    }

    console.log(`Email sent! Message ID: ${result.messageId}`);
  } catch (error) {
    console.error('Failed to send the test email:', error.message);
    process.exit(1);
  }
}

main();
