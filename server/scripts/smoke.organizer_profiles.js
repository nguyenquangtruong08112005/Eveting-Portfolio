// Smoke test for Organizer Profile repository (Postgres, read-only only by default)
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.organizer_profiles.js
//   DATABASE_URL=postgres://... ORGANIZER_SMOKE_ID=<id> node scripts/smoke.organizer_profiles.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.ORGANIZER_DATABASE_PROVIDER = 'postgres';

async function smoke() {
require('../src/alias-bootstrap');
  var organizerRepo = require('../src/providers/database/organizer.repository');

  console.log('Organizer repository provider: ' + process.env.ORGANIZER_DATABASE_PROVIDER);
  console.log('');

  var smokeId = process.env.ORGANIZER_SMOKE_ID;
  if (smokeId) {
    console.log('Looking up organizer by id: ' + smokeId);
    var profile = await organizerRepo.getOrganizerProfile(smokeId);
    if (profile) {
      console.log('Found: ' + JSON.stringify(profile, null, 2));
    } else {
      console.log('Not found');
    }
  } else {
    console.log('Set ORGANIZER_SMOKE_ID env var to test a specific organizer.');
    console.log('Pass ORGANIZER_SMOKE_ID=<PostgreSQL-UUID> to run smoke test.');
    
    // Attempt dummy read of any organizer if no ID provided
    const { query } = require('../src/providers/database/postgres.client');
    const result = await query('SELECT id FROM organizer_profiles LIMIT 1');
    if (result.rows.length > 0) {
      const id = result.rows[0].id;
      console.log('Found organizer ID in database: ' + id + ', running test with it:');
      var profile = await organizerRepo.getOrganizerProfile(id);
      console.log('Profile details: ' + JSON.stringify(profile, null, 2));
    } else {
      console.log('No organizer profiles found in Postgres database.');
    }
  }
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
