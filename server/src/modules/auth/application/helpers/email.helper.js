const emailProvider = require('@/providers/email');

/**
 * Send email for auth module (verification, password reset, etc.) using shared SMTP provider.
 * Preserves current API signature without leaking sensitive tokens in logs.
 */
async function sendEmail({ to, subject, text, html, from }) {
  return await emailProvider.sendEmail({ to, subject, text, html, from });
}

module.exports = { sendEmail };
