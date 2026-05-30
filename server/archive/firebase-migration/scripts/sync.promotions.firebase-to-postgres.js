// Sync promotions from Firebase to Postgres (upsert, no delete).
// Compare active public promotions and optionally organizer with PROMOTION_SMOKE_ORGANIZER_ID.
// Usage:
//   DATABASE_URL=postgres://... node scripts/sync.promotions.firebase-to-postgres.js
//   DATABASE_URL=postgres://... PROMOTION_SYNC_ORGANIZER_ID=<id> node scripts/sync.promotions.firebase-to-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../../../providers/database/firebase.promotion.repository');
var postgresRepo = require('../../../providers/database/postgres.promotion.repository');

async function main() {
  var total = 0;

  var activePromos = await firebaseRepo.getActivePromotions();
  for (var i = 0; i < activePromos.length; i++) {
    var p = activePromos[i];
    await postgresRepo.createPromotion(p.id, p);
    total++;
  }
  console.log('Synced ' + activePromos.length + ' active public promotions');

  var organizerId = process.env.PROMOTION_SYNC_ORGANIZER_ID;
  if (organizerId) {
    var orgPromos = await firebaseRepo.getPromotionsByOrganizer(organizerId);
    for (var j = 0; j < orgPromos.length; j++) {
      var op = orgPromos[j];
      await postgresRepo.createPromotion(op.id, op);
      total++;
    }
    console.log('Synced ' + orgPromos.length + ' promotions for organizer ' + organizerId);
  }

  console.log('Total promotions upserted: ' + total);
}

main().catch(function(err) {
  console.error('Sync failed: ' + err.message);
  process.exit(1);
});
