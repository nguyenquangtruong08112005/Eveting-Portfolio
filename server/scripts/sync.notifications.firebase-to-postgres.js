// Sync notifications from Firebase to Postgres (upsert, no delete)
// Usage:
//   DATABASE_URL=postgres://... node scripts/sync.notifications.firebase-to-postgres.js
//   DATABASE_URL=postgres://... NOTIFICATION_SYNC_USER_ID=<id> node scripts/sync.notifications.firebase-to-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../providers/database/firebase.notification.repository');
var postgresRepo = require('../providers/database/postgres.notification.repository');

async function main() {
  var userId = process.env.NOTIFICATION_SYNC_USER_ID || 'user_alice';

  var notifications = await firebaseRepo.getNotificationsByUserId(userId);

  for (var i = 0; i < notifications.length; i++) {
    var n = notifications[i];
    await postgresRepo.createNotification(n);
  }

  console.log('Synced ' + notifications.length + ' notifications for user ' + userId + ' from Firebase to Postgres');
}

main().catch(function(err) {
  console.error('Sync failed: ' + err.message);
  process.exit(1);
});
