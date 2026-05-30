// Sync venues from Firebase to Postgres (upsert, no delete)
// Usage:
//   DATABASE_URL=postgres://... node scripts/sync.venues.firebase-to-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../../../providers/database/firebase.venue.repository');
var postgresRepo = require('../../../providers/database/postgres.venue.repository');

async function main() {
  var venues = await firebaseRepo.getAllVenues();

  for (var i = 0; i < venues.length; i++) {
    var v = venues[i];
    await postgresRepo.createVenue(v.id, v);
  }

  console.log('Synced ' + venues.length + ' venues from Firebase to Postgres');
}

main().catch(function(err) {
  console.error('Sync failed: ' + err.message);
  process.exit(1);
});
