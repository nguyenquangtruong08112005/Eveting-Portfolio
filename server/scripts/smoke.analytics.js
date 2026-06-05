// Smoke test for Analytics repository (Postgres, read-only/read-write)
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.analytics.js
//   DATABASE_URL=postgres://... ANALYTICS_SMOKE_ID=<id> node scripts/smoke.analytics.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.ANALYTICS_DATABASE_PROVIDER = 'postgres';

async function smoke() {
require('../src/alias-bootstrap');
  const analyticsRepo = require('../src/providers/database/analytics.repository');

  console.log('Analytics repository provider: ' + process.env.ANALYTICS_DATABASE_PROVIDER);
  console.log('');

  const smokeId = process.env.ANALYTICS_SMOKE_ID || 'event_ai_summit';
  console.log('Looking up analytics by event id: ' + smokeId);
  const analytics = await analyticsRepo.getAnalyticsByEventId(smokeId);
  if (analytics) {
    console.log('Found (getAnalyticsByEventId): ' + JSON.stringify(analytics, null, 2));
  } else {
    console.log('Not found via getAnalyticsByEventId');
  }

  // Test getAnalyticsByEventIds
  console.log('');
  console.log('Testing getAnalyticsByEventIds with: ' + JSON.stringify([smokeId]));
  const list = await analyticsRepo.getAnalyticsByEventIds([smokeId]);
  console.log('getAnalyticsByEventIds returned ' + list.length + ' records');
  if (list.length > 0) {
    console.log('Returned: ' + JSON.stringify(list, null, 2));
  }
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
