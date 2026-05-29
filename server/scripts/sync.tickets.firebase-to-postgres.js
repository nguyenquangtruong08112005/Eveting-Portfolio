// Sync tickets from Firebase to Postgres (upsert, no delete)
// Usage:
//   DATABASE_URL=postgres://... node scripts/sync.tickets.firebase-to-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const { db } = require('../config/firebase.config');
const postgresRepo = require('../providers/database/postgres.ticket.repository');

async function main() {
  const snapshot = await db.collection('Tickets').get();
  console.log('Found ' + snapshot.size + ' tickets in Firebase Firestore');

  let synced = 0;
  let errors = 0;

  for (const doc of snapshot.docs) {
    try {
      const ticketData = doc.data();
      await postgresRepo.createTicket(doc.id, ticketData);
      synced++;
    } catch (e) {
      console.error('Error syncing ticket ' + doc.id + ': ' + e.message);
      errors++;
    }
  }

  console.log('Synced ' + synced + ' tickets from Firebase to Postgres');
  if (errors > 0) {
    console.warn('Encountered ' + errors + ' errors during sync');
  }
}

main().catch(function(err) {
  console.error('Sync failed: ' + err.message);
  process.exit(1);
});
