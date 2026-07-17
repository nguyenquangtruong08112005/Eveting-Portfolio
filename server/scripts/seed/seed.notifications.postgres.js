// Seed notifications from seed/notifications.json into Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/seed.notifications.postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.NOTIFICATION_DATABASE_PROVIDER = 'postgres';

var notifications = require('../../seed/postgres/notifications.json');
require('../../src/alias-bootstrap');
var notificationRepo = require('../../src/providers/database/notification.repository');

async function seed() {
  for (var i = 0; i < notifications.length; i++) {
    var n = notifications[i];
    await notificationRepo.createNotification(n);
  }
  console.log('Seeded ' + notifications.length + ' notifications');
}

seed().catch(function(err) {
  console.error('Seed failed: ' + err.message);
  process.exit(1);
});
