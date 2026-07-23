// Smoke test for Event repository (Postgres, read-only only)
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.events.js
//   DATABASE_URL=postgres://... EVENT_SMOKE_ID=<id> node scripts/smoke.events.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.EVENT_DATABASE_PROVIDER = 'postgres';

async function smoke() {
require('../../src/alias-bootstrap');
  const eventRepo = require('../../src/providers/database/event.repository');

  console.log('Event repository provider: ' + process.env.EVENT_DATABASE_PROVIDER);
  console.log('');

  const smokeId = process.env.EVENT_SMOKE_ID || 'evt_vdf_hcm_2025';
  console.log('Looking up event by id: ' + smokeId);
  const event = await eventRepo.getEventById(smokeId);
  if (event) {
    console.log('Found (getEventById): ' + JSON.stringify(event, null, 2));
  } else {
    console.log('Not found via getEventById');
  }

  console.log('');
  const eventData = await eventRepo.getEventDataById(smokeId);
  if (eventData) {
    console.log('Found (getEventDataById): ' + JSON.stringify(eventData, null, 2));
  } else {
    console.log('Not found via getEventDataById');
  }

  console.log('');
  const eventRaw = await eventRepo.getEventRawById(smokeId);
  console.log('getEventRawById: exists = ' + eventRaw.exists + ', id = ' + eventRaw.id);

  console.log('');
  const activeEvents = await eventRepo.getActiveEventsInDateRange(0, Date.now() + 1000 * 60 * 60 * 24 * 365 * 10);
  console.log('getActiveEventsInDateRange: returned ' + activeEvents.length + ' active events');

  if (event && event.organizerId) {
    console.log('');
    const orgEvents = await eventRepo.getEventsByOrganizerId(event.organizerId, { page: 1, limit: 5 });
    console.log('getEventsByOrganizerId for organizer ' + event.organizerId + ' returned ' + orgEvents.length + ' events');

    const orgEntries = await eventRepo.getEventEntriesByOrganizer(event.organizerId);
    console.log('getEventEntriesByOrganizer for organizer ' + event.organizerId + ' returned ' + orgEntries.length + ' entries');
  }

  console.log('');
  const publicEvents = await eventRepo.getPublicEventsPage(1, 5);
  console.log('getPublicEventsPage: totalItems = ' + publicEvents.totalItems + ', returned ' + publicEvents.entries.length + ' entries');
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
