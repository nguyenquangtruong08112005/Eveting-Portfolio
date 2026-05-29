// Smoke test for Media repository (Postgres, read-only)
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.media.js
//   DATABASE_URL=postgres://... MEDIA_SMOKE_EVENT_ID=<id> node scripts/smoke.media.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.MEDIA_DATABASE_PROVIDER = 'postgres';

async function smoke() {
  var mediaRepo = require('../providers/database/media.repository');

  console.log('Media repository provider: ' + process.env.MEDIA_DATABASE_PROVIDER);
  console.log('');

  var smokeId = process.env.MEDIA_SMOKE_EVENT_ID || 'evt_vdf_hcm_2025';
  var result = await mediaRepo.getEventMediaPage(smokeId, 1, 10);
  console.log('getEventMediaPage("' + smokeId + '", 1, 10) returned ' + result.media.length + ' media items');
  console.log('Pagination: ' + JSON.stringify(result.pagination, null, 2));
  if (result.media.length > 0) {
    console.log('First media item: ' + JSON.stringify(result.media[0], null, 2));
  }
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
