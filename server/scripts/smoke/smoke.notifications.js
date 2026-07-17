// Smoke test for Notification repository (Postgres, read-only)
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.notifications.js
//   DATABASE_URL=postgres://... NOTIFICATION_SMOKE_USER_ID=<id> node scripts/smoke.notifications.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.NOTIFICATION_DATABASE_PROVIDER = 'postgres';

async function smoke() {
require('../../src/alias-bootstrap');
  var notificationRepo = require('../../src/providers/database/notification.repository');

  console.log('Notification repository provider: ' + process.env.NOTIFICATION_DATABASE_PROVIDER);
  console.log('');

  var smokeId = process.env.NOTIFICATION_SMOKE_USER_ID || 'user_alice';
  var notifications = await notificationRepo.getNotificationsByUserId(smokeId);
  console.log('getNotificationsByUserId("' + smokeId + '") returned ' + notifications.length + ' notifications');
  if (notifications.length > 0) {
    console.log('First notification: ' + JSON.stringify(notifications[0], null, 2));
  }
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
