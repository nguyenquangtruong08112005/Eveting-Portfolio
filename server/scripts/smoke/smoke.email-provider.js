require('../../src/alias-bootstrap');
const assert = require('assert');
const emailProvider = require('../../src/providers/email');

async function runSmokeTest() {
  console.log('Running SMTP Email Provider Smoke Test...');

  // Ensure mock mode for smoke testing without real network calls
  process.env.AUTH_MOCK_EMAIL = 'true';
  emailProvider.resetTransporter();

  // 1. Verify mock mode helper
  assert.strictEqual(emailProvider.isMockMode(), true, 'isMockMode() should return true when AUTH_MOCK_EMAIL=true');

  // 2. Test sending email in mock mode
  const res = await emailProvider.sendEmail({
    to: 'user@example.com',
    subject: 'Verification Code',
    text: 'Your verification token is 123456',
    html: '<p>Your verification token is <strong>123456</strong></p>',
  });

  assert.strictEqual(res.success, true, 'sendEmail should return success: true');
  assert.strictEqual(res.mock, true, 'sendEmail should operate in mock mode');
  assert.ok(res.messageId.startsWith('mock-'), 'messageId should be mock prefix');

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
