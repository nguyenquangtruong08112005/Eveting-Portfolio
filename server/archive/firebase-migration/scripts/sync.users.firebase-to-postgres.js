// Sync user profiles from Firebase to Postgres (upsert, no delete)
// Usage:
//   DATABASE_URL=postgres://... node scripts/sync.users.firebase-to-postgres.js
//
// Reads all user UIDs from Firebase Auth, fetches each profile from
// Firestore Users collection and upserts into Postgres user_profiles.
//
// If SYNC_ALL_USERS is set, also syncs users not found in Auth list
// by reading all Firestore Users docs directly.

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../../../providers/database/firebase.user.repository');
var postgresRepo = require('../../../providers/database/postgres.user.repository');
var admin = require('firebase-admin');

async function main() {
  var synced = 0;
  var errors = 0;

  // Try listing Firebase Auth users
  var uidList = [];
  try {
    var listResult = await admin.auth().listUsers();
    uidList = listResult.users.map(function(u) { return u.uid; });
    console.log('Found ' + uidList.length + ' users in Firebase Auth');
  } catch (e) {
    console.warn('Could not list Firebase Auth users: ' + e.message);
    console.warn('Will fall back to Firestore Users collection scan.');
  }

  // If Auth listing failed or SYNC_ALL_USERS is set, scan Firestore
  if (uidList.length === 0 || process.env.SYNC_ALL_USERS) {
    console.log('Scanning Firestore Users collection...');
    var snapshot = await admin.firestore().collection('Users').get();
    uidList = snapshot.docs.map(function(d) { return d.id; });
    console.log('Found ' + uidList.length + ' user docs in Firestore');
  }

  for (var i = 0; i < uidList.length; i++) {
    var uid = uidList[i];
    try {
      var userData = await firebaseRepo.getRawUserDataById(uid);
      if (!userData) {
        console.warn('No Firestore doc for UID: ' + uid + ' -- skipping');
        continue;
      }
      await postgresRepo.createUser(uid, userData);
      synced++;
    } catch (e) {
      console.error('Error syncing user ' + uid + ': ' + e.message);
      errors++;
    }
  }

  console.log('Synced ' + synced + ' users from Firebase to Postgres');
  if (errors > 0) {
    console.warn('Encountered ' + errors + ' errors during sync');
  }
}

main().catch(function(err) {
  console.error('Sync failed: ' + err.message);
  process.exit(1);
});
