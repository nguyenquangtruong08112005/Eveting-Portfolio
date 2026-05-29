// Sync reviews from Firebase to Postgres (upsert, no delete)
// Usage:
//   DATABASE_URL=postgres://... node scripts/sync.reviews.firebase-to-postgres.js
//   DATABASE_URL=postgres://... REVIEW_SYNC_EVENT_ID=<id> node scripts/sync.reviews.firebase-to-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../providers/database/firebase.review.repository');
var postgresRepo = require('../providers/database/postgres.review.repository');

async function main() {
  var eventId = process.env.REVIEW_SYNC_EVENT_ID || 'evt_vdf_hcm_2025';

  var reviewsResult = await firebaseRepo.getReviewsByEventId(eventId, 1, 10000);
  var reviews = reviewsResult.reviews;

  for (var i = 0; i < reviews.length; i++) {
    var r = reviews[i];
    await postgresRepo.createReview(r.id, r);
  }

  console.log('Synced ' + reviews.length + ' reviews for event ' + eventId + ' from Firebase to Postgres');
}

main().catch(function(err) {
  console.error('Sync failed: ' + err.message);
  process.exit(1);
});
