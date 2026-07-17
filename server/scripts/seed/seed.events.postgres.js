// Seed events from seed/events_FIXED.json into Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/seed.events.postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.EVENT_DATABASE_PROVIDER = 'postgres';

var events = require('../../seed/postgres/events_FIXED.json');
require('../../src/alias-bootstrap');
var eventRepo = require('../../src/providers/database/event.repository');

async function seed() {
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    // Force status to active so they display on the public list
    if (e.status !== 'finished' && e.status !== 'cancelled') {
      e.status = 'active';
    }
    await eventRepo.createEvent(e.id, e);
  }
  console.log('Seeded ' + events.length + ' events');
}

seed().catch(function(err) {
  console.error('Seed failed: ' + err.message);
  process.exit(1);
});
