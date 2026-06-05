// Smoke test for Featured Profile repository (Postgres, read-only only)
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.featured_profiles.js
//   DATABASE_URL=postgres://... FEATURED_PROFILE_SMOKE_ID=<id> node scripts/smoke.featured_profiles.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.FEATURED_PROFILE_DATABASE_PROVIDER = 'postgres';

async function smoke() {
require('../src/alias-bootstrap');
  var profileRepo = require('../src/providers/database/featuredProfile.repository');

  console.log('FeaturedProfile repository provider: ' + process.env.FEATURED_PROFILE_DATABASE_PROVIDER);
  console.log('');

  var result = await profileRepo.getFeaturedProfilesPage(1, 10);
  console.log('getFeaturedProfilesPage page 1 returned ' + result.profiles.length + ' profiles');
  console.log('Total items: ' + result.pagination.totalItems);
  console.log('Total pages: ' + result.pagination.totalPages);
  if (result.profiles.length > 0) {
    console.log('First profile: ' + JSON.stringify(result.profiles[0], null, 2));
  }

  var smokeId = process.env.FEATURED_PROFILE_SMOKE_ID || (result.profiles.length > 0 ? result.profiles[0].id : null);
  if (smokeId) {
    console.log('\nLooking up profile by id: ' + smokeId);
    var profile = await profileRepo.getFeaturedProfileById(smokeId);
    if (profile) {
      console.log('Found: ' + JSON.stringify(profile, null, 2));
    } else {
      console.log('Not found');
    }

    console.log('\nLooking up profiles by ids: ' + JSON.stringify([smokeId]));
    var profiles = await profileRepo.getFeaturedProfilesByIds([smokeId]);
    console.log('Found ' + profiles.length + ' profiles');

    console.log('\nLooking up profile names by ids: ' + JSON.stringify([smokeId]));
    var names = await profileRepo.getFeaturedProfileNamesByIds([smokeId]);
    console.log('Names: ' + JSON.stringify(names));
  }
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
