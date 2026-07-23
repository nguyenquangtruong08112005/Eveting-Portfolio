// Seed venues from seed/venues.json into Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/seed.venues.postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.VENUE_DATABASE_PROVIDER = 'postgres';

var venues = require('../../seed/postgres/venues.json');
require('../../src/alias-bootstrap');
var venueRepo = require('../../src/providers/database/venue.repository');

async function seed() {
  for (var i = 0; i < venues.length; i++) {
    var v = venues[i];
    await venueRepo.createVenue(v.id, v);
  }
  console.log('Seeded ' + venues.length + ' venues');
}

seed().catch(function(err) {
  console.error('Seed failed: ' + err.message);
  process.exit(1);
});
