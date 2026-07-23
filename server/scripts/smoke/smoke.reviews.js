// Smoke test for Review repository (Postgres, read-only)
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.reviews.js
//   DATABASE_URL=postgres://... REVIEW_SMOKE_EVENT_ID=<id> node scripts/smoke.reviews.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.REVIEW_DATABASE_PROVIDER = 'postgres';

async function smoke() {
require('../../src/alias-bootstrap');
  var reviewRepo = require('../../src/providers/database/review.repository');

  console.log('Review repository provider: ' + process.env.REVIEW_DATABASE_PROVIDER);
  console.log('');

  var eventId = process.env.REVIEW_SMOKE_EVENT_ID || 'evt_vdf_hcm_2025';
  var result = await reviewRepo.getReviewsByEventId(eventId, 1, 5);
  console.log('getReviewsByEventId("' + eventId + '", 1, 5) returned ' + result.reviews.length + ' reviews');
  console.log('Total items: ' + result.pagination.totalItems);
  console.log('Total pages: ' + result.pagination.totalPages);
  if (result.reviews.length > 0) {
    console.log('First review: ' + JSON.stringify(result.reviews[0], null, 2));
  }

  var reviewId = process.env.REVIEW_SMOKE_ID;
  if (reviewId) {
    console.log('\nCreating review with id: ' + reviewId);
    await reviewRepo.createReview(reviewId, {
      eventId: eventId,
      userId: 'smoke_user',
      rating: 5,
      comment: 'Smoke test review',
      createdAt: Date.now()
    });
    console.log('createReview succeeded');
  }

  console.log('\ncheckUserTicketForEvent(smoke_user, ' + eventId + '): ' + (await reviewRepo.checkUserTicketForEvent('smoke_user', eventId)));
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
