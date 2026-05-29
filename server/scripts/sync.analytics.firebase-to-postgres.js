// Sync analytics from Firebase to Postgres (upsert, no delete)
// Usage:
//   DATABASE_URL=postgres://... node scripts/sync.analytics.firebase-to-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const { db } = require('../config/firebase.config');
const postgresRepo = require('../providers/database/postgres.analytics.repository');

async function main() {
  const snapshot = await db.collection('Analytics').get();
  console.log('Found ' + snapshot.size + ' analytics documents in Firebase Firestore');

  let synced = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    try {
      const analyticsData = doc.data();
      await postgresRepo.createAnalytics(doc.id, analyticsData);
      synced++;
    } catch (e) {
      console.error('Error syncing analytics ' + doc.id + ': ' + e.message);
      errors++;
    }
  }

  console.log('Synced ' + synced + ' analytics documents from Firebase to Postgres');
  if (errors > 0) {
    console.warn('Encountered ' + errors + ' errors during sync');
  }
}

main().catch(function(err) {
  console.error('Sync failed: ' + err.message);
  process.exit(1);
});
