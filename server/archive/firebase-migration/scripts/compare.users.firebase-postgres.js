// Compare user profile data between Firebase and Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/compare.users.firebase-postgres.js
//   DATABASE_URL=postgres://... USER_COMPARE_IDS=uid1,uid2 node scripts/compare.users.firebase-postgres.js
//
// Without USER_COMPARE_IDS, compares all UIDs found in both Firebase Auth
// and Firestore Users collection.

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../../../providers/database/firebase.user.repository');
var postgresRepo = require('../../../providers/database/postgres.user.repository');
var admin = require('firebase-admin');

function stableStringify(obj) {
  return JSON.stringify(obj, function(key, value) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce(function(acc, k) {
        acc[k] = value[k];
        return acc;
      }, {});
    }
    return value;
  });
}

function sortById(users) {
  return users.slice().sort(function(a, b) {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}

var matched = 0;
var missingInPostgres = [];
var missingInFirebase = [];
var different = [];

async function compare() {
  var uidList = [];

  var explicitIds = process.env.USER_COMPARE_IDS;
  if (explicitIds) {
    uidList = explicitIds.split(',').map(function(s) { return s.trim(); });
    console.log('Comparing ' + uidList.length + ' explicit UIDs');
  } else {
    // Collect UIDs from Firebase Auth
    try {
      var listResult = await admin.auth().listUsers();
      uidList = listResult.users.map(function(u) { return u.uid; });
    } catch (e) {
      console.warn('Could not list Firebase Auth users, falling back to Firestore scan.');
    }

    if (uidList.length === 0) {
      var snapshot = await admin.firestore().collection('Users').get();
      uidList = snapshot.docs.map(function(d) { return d.id; });
    }
    console.log('Comparing ' + uidList.length + ' users');
  }

  var fbMap = {};
  var pgMap = {};

  // Batch fetch from both
  for (var i = 0; i < uidList.length; i++) {
    var uid = uidList[i];
    try {
      var fbUser = await firebaseRepo.getRawUserDataById(uid);
      if (fbUser) {
        fbMap[uid] = fbUser;
      }
    } catch (e) {
      console.warn('Firebase fetch failed for ' + uid + ': ' + e.message);
    }
    try {
      var pgUser = await postgresRepo.getRawUserDataById(uid);
      if (pgUser) {
        pgMap[uid] = pgUser;
      }
    } catch (e) {
      console.warn('Postgres fetch failed for ' + uid + ': ' + e.message);
    }
  }

  var allIds = Object.keys(fbMap).concat(Object.keys(pgMap)).filter(function(id, idx, arr) {
    return arr.indexOf(id) === idx;
  }).sort();

  allIds.forEach(function(id) {
    var inFb = id in fbMap;
    var inPg = id in pgMap;
    if (inFb && inPg) {
      var fbStr = stableStringify(fbMap[id]);
      var pgStr = stableStringify(pgMap[id]);
      if (fbStr === pgStr) {
        matched++;
      } else {
        different.push({ id: id, firebase: fbMap[id], postgres: pgMap[id] });
      }
    } else if (inFb && !inPg) {
      missingInPostgres.push(id);
    } else if (!inFb && inPg) {
      missingInFirebase.push(id);
    }
  });

  console.log('matched: ' + matched);
  console.log('missing in postgres: ' + missingInPostgres.length);
  console.log('missing in firebase: ' + missingInFirebase.length);
  console.log('different: ' + different.length);

  missingInPostgres.forEach(function(id) {
    console.log('  MISSING-PG: ' + id);
  });
  missingInFirebase.forEach(function(id) {
    console.log('  MISSING-FB: ' + id);
  });
  different.forEach(function(d) {
    console.log('  DIFFERENT: ' + d.id);
  });

  var hasDiff = missingInPostgres.length > 0 || missingInFirebase.length > 0 || different.length > 0;
  if (hasDiff) {
    process.exit(1);
  }
}

compare().catch(function(err) {
  console.error('Compare failed: ' + err.message);
  process.exit(1);
});
