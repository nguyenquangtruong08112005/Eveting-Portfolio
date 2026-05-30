// Sync organizer profiles from Firebase to Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/sync.organizer_profiles.firebase-to-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../../../providers/database/firebase.user.repository');
var postgresRepo = require('../../../providers/database/postgres.organizer.repository');
var admin = require('firebase-admin');

async function main() {
  var synced = 0;
  var errors = 0;

  console.log('Scanning Firestore Users collection for organizers...');
  var snapshot = await admin.firestore().collection('Users').get();
  var docs = snapshot.docs.filter(function(doc) {
    var data = doc.data();
    return data.roles && data.roles.indexOf('organizer') !== -1 && data.organizerInfo;
  });

  console.log('Found ' + docs.length + ' organizers with profiles in Firestore');

  for (var i = 0; i < docs.length; i++) {
    var doc = docs[i];
    var uid = doc.id;
    var userData = doc.data();
    try {
      var organizerInfo = userData.organizerInfo || {};
      await postgresRepo.addOrganizerRoleToUser(uid, organizerInfo);
      synced++;
    } catch (e) {
      console.error('Error syncing organizer ' + uid + ': ' + e.message);
      errors++;
    }
  }

  console.log('Synced ' + synced + ' organizers from Firebase to Postgres');
  if (errors > 0) {
    console.warn('Encountered ' + errors + ' errors during sync');
  }
}

main().catch(function(err) {
  console.error('Sync failed: ' + err.message);
  process.exit(1);
});
