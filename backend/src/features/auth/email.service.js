const { sendTemplatedEmail } = require('../email/email.service');
const config = require('../../config');

function buildVerifyUrl(token) {
  const baseUrl =
    (config.app && config.app.baseUrl) || config.corsOrigin || 'http://localhost:3000';
  const normalized = baseUrl.replace(/\/$/, '');
  return `${normalized}/verify-email?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail({ to, name, token, expiresAt }) {
  const verifyUrl = buildVerifyUrl(token);
  await sendTemplatedEmail({
    to,
    subject: 'Verify your email for Onkur',
    heading: 'Confirm your Onkur email address',
    previewText: 'Tap to verify your Onkur account and start creating impact.',
    bodyLines: [
      `Hi ${name || 'there'},`,
      'Thanks for joining Onkur! Please confirm your email so we can keep your impact journey secure.',
      expiresAt
        ? `This link will expire on ${new Date(expiresAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}.`
        : 'This link will expire soon for your security.',
    ],
    cta: {
      label: 'Verify email',
      url: verifyUrl,
    },
  });
}

async function sendWelcomeEmail({ to, name }) {
  await sendTemplatedEmail({
    to,
    subject: 'Welcome to Onkur',
    heading: 'You are all set! 🌿',
    previewText: 'Thank you for verifying your Onkur account.',
    bodyLines: [
      `Hi ${name || 'there'},`,
      'Your email is verified and you are ready to explore events, earn eco-badges, and track your community impact.',
      'Log in to find an event that speaks to you and start cultivating change.',
    ],
    cta: {
      label: 'Log in to Onkur',
      url: `${((config.app && config.app.baseUrl) || config.corsOrigin || 'http://localhost:3000').replace(/\/$/, '')}/login`,
    },
  });
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
};
