// Smoke test for Promotion repository (Postgres, read-only).
// Compares active public promotions and optionally organizer with PROMOTION_SMOKE_ORGANIZER_ID.
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.promotions.js
//   DATABASE_URL=postgres://... PROMOTION_SMOKE_ORGANIZER_ID=<id> node scripts/smoke.promotions.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.PROMOTION_DATABASE_PROVIDER = 'postgres';

async function smoke() {
require('../src/alias-bootstrap');
  var promoRepo = require('../src/providers/database/promotion.repository');

  console.log('Promotion repository provider: ' + process.env.PROMOTION_DATABASE_PROVIDER);
  console.log('');

  var active = await promoRepo.getActivePromotions();
  console.log('getActivePromotions returned ' + active.length + ' promotions');
  if (active.length > 0) {
    console.log('First active promotion: ' + JSON.stringify(active[0], null, 2));
  }

  var smokeId = process.env.PROMOTION_SMOKE_ORGANIZER_ID;
  if (smokeId) {
    console.log('\nLooking up promotions by organizer: ' + smokeId);
    var orgPromos = await promoRepo.getPromotionsByOrganizer(smokeId);
    console.log('getPromotionsByOrganizer("' + smokeId + '") returned ' + orgPromos.length + ' promotions');
    if (orgPromos.length > 0) {
      console.log('First: ' + JSON.stringify(orgPromos[0], null, 2));
    }
  }
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
