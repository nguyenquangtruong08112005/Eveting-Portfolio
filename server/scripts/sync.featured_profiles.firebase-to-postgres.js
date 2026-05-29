// Sync featured profiles from Firebase to Postgres (upsert, no delete)
// Usage:
//   DATABASE_URL=postgres://... node scripts/sync.featured_profiles.firebase-to-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../providers/database/firebase.featuredProfile.repository');
var postgresRepo = require('../providers/database/postgres.featuredProfile.repository');

async function main() {
  var profiles = await firebaseRepo.getAllFeaturedProfiles();

  for (var i = 0; i < profiles.length; i++) {
    var p = profiles[i];
    await postgresRepo.createFeaturedProfile(p.id, p);
  }

  console.log('Synced ' + profiles.length + ' featured profiles from Firebase to Postgres');
}

main().catch(function(err) {
  console.error('Sync failed: ' + err.message);
  process.exit(1);
});
