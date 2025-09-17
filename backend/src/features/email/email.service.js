const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');
const config = require('../../config');

let transporter;
let transportInitialized = false;

function resolveTransporter() {
  if (transportInitialized) {
    return transporter;
  }

  transportInitialized = true;
  const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = config.email || {};

  if (!smtpHost) {
    logger.warn('Email transport is not configured. Outbound messages will be skipped.');
    transporter = null;
    return transporter;
  }

  const transportOptions = {
    host: smtpHost,
    port: smtpPort,
    secure: Boolean(smtpSecure),
  };

  if (smtpUser && smtpPass) {
    transportOptions.auth = {
      user: smtpUser,
      pass: smtpPass,
    };
  }

  transporter = nodemailer.createTransport(transportOptions);
  return transporter;
}

function renderStandardTemplate({ heading, bodyLines = [], cta, previewText }) {
  const safeBody = Array.isArray(bodyLines) ? bodyLines : [String(bodyLines || '')];
  const bodyHtml = safeBody
    .map((line) => `<p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #1f2937;">${line}</p>`)
    .join('');

  const ctaHtml = cta && cta.url && cta.label
    ? `<p style="margin: 24px 0; text-align: center;"><a href="${cta.url}" style="display: inline-block; padding: 12px 24px; background: #2F855A; color: #ffffff; text-decoration: none; border-radius: 9999px; font-weight: 600;">${cta.label}</a></p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${heading}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin: 0; padding: 0; background: #f7faf5; font-family: 'Inter', 'Segoe UI', sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: #f7faf5; padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 18px 40px rgba(47, 133, 90, 0.18); overflow: hidden;">
            <tr>
              <td style="background: #2F855A; padding: 28px 32px; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.02em;">Onkur</h1>
                <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.85;">Rooted in nature. Built for community action.</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px;">
                <h2 style="margin: 0 0 16px; font-size: 22px; color: #2F855A;">${heading}</h2>
                ${bodyHtml}
                ${ctaHtml}
                <p style="margin: 32px 0 0; font-size: 14px; color: #6b7280;">With gratitude,<br />The Onkur team</p>
              </td>
            </tr>
            <tr>
              <td style="background: #f7faf5; padding: 20px 32px; text-align: center; font-size: 12px; color: #9ca3af;">
                You are receiving this email because you created an account on Onkur.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const textParts = [heading, '', ...safeBody];
  if (cta && cta.url && cta.label) {
    textParts.push('', `${cta.label}: ${cta.url}`);
  }
  textParts.push('', 'With gratitude,', 'The Onkur team');
  const text = textParts.join('\n');

  return { html, text, previewText: previewText || heading };
}

async function sendEmail({ to, subject, html, text, headers = {} }) {
  const transport = resolveTransporter();
  const from = (config.email && config.email.from) || 'Onkur <no-reply@onkur.org>';

  if (!transport) {
    logger.info('Email send skipped because transport is not configured', { to, subject });
    return null;
  }

  const payload = {
    from,
    to,
    subject,
    html,
    text,
    headers,
  };

  try {
    const info = await transport.sendMail(payload);
    logger.info('Email dispatched', {
      to,
      subject,
      messageId: info.messageId,
    });
    return info;
  } catch (error) {
    logger.error('Failed to send email', {
      to,
      subject,
      error: error.message,
    });
    throw error;
  }
}

async function sendTemplatedEmail({ to, subject, heading, bodyLines, cta, previewText, headers }) {
  const template = renderStandardTemplate({ heading, bodyLines, cta, previewText });
  return sendEmail({ to, subject, html: template.html, text: template.text, headers });
}

module.exports = {
  sendEmail,
  sendTemplatedEmail,
  renderStandardTemplate,
};
