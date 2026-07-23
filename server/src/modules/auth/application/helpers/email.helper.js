const nodemailer = require('nodemailer');

function getMailTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

async function sendEmail({ to, subject, text, html }) {
  const transporter = getMailTransporter();
  if (transporter) {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@eventing.tdtuer.com',
      to,
      subject,
      text,
      html,
    });
  } else if (process.env.AUTH_MOCK_EMAIL === 'true') {
    console.log(`[MOCK EMAIL] To: ${to}\nSubject: ${subject}\nContent: ${text || html}`);
  } else {
    throw new Error('Email service not configured and mock mode is off');
  }
}

module.exports = { sendEmail };
