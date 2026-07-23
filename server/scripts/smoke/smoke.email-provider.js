require('../../src/alias-bootstrap');
const assert = require('assert');
const emailProvider = require('../../src/providers/email');

async function runSmokeTest() {
  console.log('Running SMTP Email Provider Smoke Test...');

  // 1. Verify explicit mock mode when AUTH_MOCK_EMAIL=true
  process.env.AUTH_MOCK_EMAIL = 'true';
  emailProvider.resetTransporter();

  assert.strictEqual(emailProvider.isMockMode(), true, 'isMockMode() should return true when AUTH_MOCK_EMAIL=true');

  const res = await emailProvider.sendEmail({
    to: 'user@example.com',
    subject: 'Verification Code',
    text: 'Your verification token is 123456',
    html: '<p>Your verification token is <strong>123456</strong></p>',
  });

  assert.strictEqual(res.success, true, 'sendEmail should return success: true');
  assert.strictEqual(res.mock, true, 'sendEmail should operate in mock mode');
  assert.ok(res.messageId.startsWith('mock-'), 'messageId should be mock prefix');

  // 2. Verify non-mock mode throws missing configuration error when SMTP settings are unconfigured
  process.env.AUTH_MOCK_EMAIL = 'false';
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  emailProvider.resetTransporter();

  assert.strictEqual(emailProvider.isMockMode(), false, 'isMockMode() should return false when AUTH_MOCK_EMAIL=false');

  await assert.rejects(
    async () => {
      await emailProvider.sendEmail({ to: 'user@example.com', subject: 'Non-mock Fail Test', text: 'Hello' });
    },
    (err) => {
      return (
        err instanceof Error &&
        err.message.includes('Email service unconfigured: missing required SMTP setting(s)')
      );
    },
    'sendEmail should throw configuration error when AUTH_MOCK_EMAIL=false and SMTP settings are missing'
  );

  // Restore mock mode for clean test environment
  process.env.AUTH_MOCK_EMAIL = 'true';
  emailProvider.resetTransporter();

  // 3. Test missing recipient validation
  await assert.rejects(
    async () => {
      await emailProvider.sendEmail({ subject: 'No Recipient' });
    },
    {
      name: 'Error',
      message: 'Recipient email (to) is required',
    },
    'sendEmail should throw if to is missing'
  );

  console.log('SMTP Email Provider Smoke Test PASSED!');
}

runSmokeTest().catch((err) => {
  console.error('Email Provider Smoke Test FAILED:', err.message);
  process.exit(1);
});
