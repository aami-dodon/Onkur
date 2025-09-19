const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');
const config = require('../../config');

const SUBJECT_PREFIX = '[Onkur]';

const TEMPLATE_THEME = {
  brandName: 'Onkur',
  brandTagline: 'Rooted in nature. Built for community action.',
  colors: {
    background: '#f4f7f6',
    card: '#ffffff',
    primary: '#2F855A',
    accent: '#bde7cf',
    body: '#1f2937',
    muted: '#6b7280',
    footer: '#9ca3af',
  },
  fontFamily: "'Inter', 'Segoe UI', sans-serif",
};

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
  const bodyHtml = safeBody.map((line) => `<p class="paragraph">${line}</p>`).join('');

  const ctaHtml =
    cta && cta.url && cta.label
      ? `<div class="cta"><a class="ctaButton" href="${cta.url}" target="_blank" rel="noreferrer">${cta.label}</a></div>`
      : '';

  const resolvedPreview = previewText || heading;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${heading}</title>
    <style>
      :root {
        color-scheme: light;
        supported-color-schemes: light;
      }

      body {
        margin: 0;
        padding: 24px 0;
        background: ${TEMPLATE_THEME.colors.background};
        font-family: ${TEMPLATE_THEME.fontFamily};
        -webkit-text-size-adjust: 100%;
      }

      table {
        border-spacing: 0;
        border-collapse: collapse;
      }

      .wrapper {
        width: 100%;
        max-width: 640px;
        background: ${TEMPLATE_THEME.colors.card};
        border-radius: 20px;
        box-shadow: 0 24px 48px rgba(47, 133, 90, 0.22);
        overflow: hidden;
      }

      .header {
        background: linear-gradient(135deg, ${TEMPLATE_THEME.colors.primary}, ${TEMPLATE_THEME.colors.accent});
        padding: 36px 32px 32px;
        text-align: left;
        color: #ffffff;
      }

      .brand {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      .tagline {
        margin: 8px 0 0;
        font-size: 15px;
        line-height: 22px;
        opacity: 0.85;
      }

      .content {
        padding: 36px 40px;
      }

      .heading {
        margin: 0 0 20px;
        font-size: 24px;
        line-height: 32px;
        color: ${TEMPLATE_THEME.colors.primary};
      }

      .paragraph {
        margin: 0 0 18px;
        font-size: 16px;
        line-height: 26px;
        color: ${TEMPLATE_THEME.colors.body};
      }

      .cta {
        margin: 32px 0;
        text-align: center;
      }

      .ctaButton {
        display: inline-block;
        padding: 14px 28px;
        border-radius: 9999px;
        background: ${TEMPLATE_THEME.colors.primary};
        color: #ffffff !important;
        text-decoration: none;
        font-weight: 600;
        box-shadow: 0 12px 24px rgba(47, 133, 90, 0.35);
      }

      .signature {
        margin: 36px 0 0;
        font-size: 14px;
        line-height: 22px;
        color: ${TEMPLATE_THEME.colors.muted};
      }

      .footer {
        padding: 24px 32px 32px;
        background: ${TEMPLATE_THEME.colors.background};
        text-align: center;
        font-size: 12px;
        line-height: 18px;
        color: ${TEMPLATE_THEME.colors.footer};
      }

      @media (max-width: 620px) {
        body {
          padding: 0;
        }

        .wrapper {
          border-radius: 0;
        }

        .content {
          padding: 28px 20px;
        }

        .heading {
          font-size: 22px;
        }
      }
    </style>
  </head>
  <body>
    <div style="display:none; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden;">${resolvedPreview}</div>
    <table role="presentation" width="100%">
      <tr>
        <td align="center" style="padding: 0 16px;">
          <table role="presentation" class="wrapper">
            <tr>
              <td class="header">
                <h1 class="brand">${TEMPLATE_THEME.brandName}</h1>
                <p class="tagline">${TEMPLATE_THEME.brandTagline}</p>
              </td>
            </tr>
            <tr>
              <td class="content">
                <h2 class="heading">${heading}</h2>
                ${bodyHtml}
                ${ctaHtml}
                <p class="signature">With gratitude,<br />The Onkur team</p>
              </td>
            </tr>
            <tr>
              <td class="footer">
                You are receiving this email because you created an account on Onkur. Manage your notification preferences inside your profile.
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

  return { html, text, previewText: resolvedPreview };
}

function applySubjectPrefix(subject) {
  const normalized = String(subject || '').trim();
  if (!normalized) {
    return SUBJECT_PREFIX;
  }
  return normalized.startsWith(SUBJECT_PREFIX) ? normalized : `${SUBJECT_PREFIX} ${normalized}`;
}

async function sendEmail({ to, subject, html, text, headers = {} }) {
  const transport = resolveTransporter();
  const from = (config.email && config.email.from) || 'Onkur <no-reply@onkur.org>';
  const finalSubject = applySubjectPrefix(subject);

  if (!transport) {
    logger.info('Email send skipped because transport is not configured', {
      to,
      subject: finalSubject,
    });
    return null;
  }

  const payload = {
    from,
    to,
    subject: finalSubject,
    html,
    text,
    headers,
  };

  try {
    const info = await transport.sendMail(payload);
    logger.info('Email dispatched', {
      to,
      subject: finalSubject,
      messageId: info.messageId,
    });
    return info;
  } catch (error) {
    logger.error('Failed to send email', {
      to,
      subject: finalSubject,
      error: error.message,
    });
    throw error;
  }
}

async function sendTemplatedEmail({ to, subject, heading, bodyLines, cta, previewText, headers }) {
  const template = renderStandardTemplate({ heading, bodyLines, cta, previewText });
  const enrichedHeaders = Object.assign({}, headers);
  if (template.previewText) {
    enrichedHeaders['X-Preheader-Text'] = template.previewText;
  }
  return sendEmail({
    to,
    subject,
    html: template.html,
    text: template.text,
    headers: enrichedHeaders,
  });
}

module.exports = {
  sendEmail,
  sendTemplatedEmail,
  renderStandardTemplate,
  applySubjectPrefix,
};
