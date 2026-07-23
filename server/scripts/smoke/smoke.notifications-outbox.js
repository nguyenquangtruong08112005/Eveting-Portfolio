require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.DATABASE_PROVIDER = 'postgres';

async function smoke() {
  require('../../src/alias-bootstrap');
  const { publish } = require('../../src/shared/events/event-publisher');
  const { processPending } = require('../../src/shared/events/outbox-processor');
  const { query } = require('../../src/providers/database/postgres.client');

  console.log('Starting Notification Outbox Smoke Test...');

  // 1. Publish a mock notification event
  const mockPayload = {
    channel: 'email',
    target: 'smoke@example.com',
    title: 'Outbox Smoke Test',
    body: 'Verifying outbox hybrid processing works!'
  };

  console.log('1. Transactionally publishing mock outbox event...');
  const outboxId = await publish('notification', mockPayload);
  console.log(`Published outbox record ID: ${outboxId}`);

  // Verify it exists in pending state
  const beforeRows = (await query('SELECT status, retry_count FROM outbox WHERE id = $1', [outboxId])).rows;
  if (beforeRows.length === 0 || beforeRows[0].status !== 'pending') {
    throw new Error('Outbox record not correctly inserted in pending state.');
  }
  console.log('Verified outbox record state: pending.');

  // 2. Process outbox
  console.log('2. Running outbox processor...');
  await processPending();

  // Verify status is completed
  const afterRows = (await query('SELECT status, retry_count, error_message FROM outbox WHERE id = $1', [outboxId])).rows;
  if (afterRows.length === 0 || afterRows[0].status !== 'completed') {
    const errorMsg = afterRows[0]?.error_message || 'unknown';
    throw new Error(`Outbox record was not processed successfully. Status: ${afterRows[0]?.status}, Error: ${errorMsg}`);
  }
  console.log('Verified outbox record state: completed.');

  // 3. Cleanup
  console.log('Cleaning up smoke test data...');
  await query('DELETE FROM outbox WHERE id = $1', [outboxId]);

  console.log('Notification Outbox Smoke Test PASSED!');
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
