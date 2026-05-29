// Sync events from Firebase to Postgres (upsert, no delete)
// Usage:
//   DATABASE_URL=postgres://... node scripts/sync.events.firebase-to-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const { db } = require('../config/firebase.config');
const postgresRepo = require('../providers/database/postgres.event.repository');

async function main() {
  const snapshot = await db.collection('Events').get();
  console.log('Found ' + snapshot.size + ' events in Firebase Firestore');

  let synced = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    try {
      const eventData = doc.data();
      // Ensure we preserve the ID
      eventData.id = doc.id;
      await postgresRepo.createEvent(doc.id, eventData);
      synced++;
    } catch (e) {
      console.error('Error syncing event ' + doc.id + ': ' + e.message);
      errors++;
    }
  }

  console.log('Synced ' + synced + ' events from Firebase to Postgres');
  if (errors > 0) {
    console.warn('Encountered ' + errors + ' errors during sync');
  }
}

main().catch(function(err) {
  console.error('Sync failed: ' + err.message);
  process.exit(1);
});
