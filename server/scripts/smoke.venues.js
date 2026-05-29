// Smoke test for Venue repository (Postgres, read-only only)
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.venues.js
//   DATABASE_URL=postgres://... VENUE_SMOKE_ID=<id> node scripts/smoke.venues.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.VENUE_DATABASE_PROVIDER = 'postgres';

async function smoke() {
  var venueRepo = require('../providers/database/venue.repository');

  console.log('Venue repository provider: ' + process.env.VENUE_DATABASE_PROVIDER);
  console.log('');

  var venues = await venueRepo.getAllVenues();
  console.log('getAllVenues returned ' + venues.length + ' venues');
  if (venues.length > 0) {
    console.log('First venue: ' + JSON.stringify(venues[0], null, 2));
  }

  var smokeId = process.env.VENUE_SMOKE_ID;
  if (smokeId) {
    console.log('\nLooking up venue by id: ' + smokeId);
    var venue = await venueRepo.getVenueById(smokeId);
    if (venue) {
      console.log('Found: ' + JSON.stringify(venue, null, 2));
    } else {
      console.log('Not found');
    }
  }
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
