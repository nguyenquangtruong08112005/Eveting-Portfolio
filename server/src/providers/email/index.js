const nodemailer = require('nodemailer');
const logger = require('@/shared/logger');

let cachedTransporter = null;

function isMockMode() {
  return process.env.AUTH_MOCK_EMAIL === 'true';
}

function validateSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const missing = [];
  if (!host || host.trim() === '') missing.push('SMTP_HOST');
  if (!user || user.trim() === '') missing.push('SMTP_USER');
  if (!pass || pass.trim() === '') missing.push('SMTP_PASS');

  if (missing.length > 0) {
    throw new Error(`Email service unconfigured: missing required SMTP setting(s): ${missing.join(', ')}`);
  }
}

function getTransporter() {
  if (isMockMode()) {
    return null;
  }
  validateSmtpConfig();

  if (!cachedTransporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }
  return cachedTransporter;
}

/**
 * Sends an email via configured SMTP provider or safe mock log-only mode.
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text content
 * @param {string} [options.html] - HTML content
 * @param {string} [options.from] - Sender address override
 */
async function sendEmail({ to, subject, text, html, from }) {
  if (!to || typeof to !== 'string' || to.trim() === '') {
    throw new Error('Recipient email (to) is required');
  }

  const sender = from || process.env.EMAIL_FROM || 'Eventing <noreply@eventing.moteo.fun>';

  if (isMockMode()) {
    logger.info(`[Email Provider (Mock)] Sent email to ${to} | Subject: "${subject || ''}"`);
    return { success: true, messageId: `mock-${Date.now()}`, mock: true };
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: sender,
      to,
      subject: subject || '',
      text,
      html,
    });
    logger.info(`[Email Provider] Sent email to ${to} | Subject: "${subject || ''}" | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, mock: false };
  } catch (error) {
    logger.error(`[Email Provider] Failed to send email to ${to} | Subject: "${subject || ''}": ${error.message}`);
    throw error;
  }
}

function resetTransporter() {
  cachedTransporter = null;
}

module.exports = {
  sendEmail,
  isMockMode,
  resetTransporter,
};
