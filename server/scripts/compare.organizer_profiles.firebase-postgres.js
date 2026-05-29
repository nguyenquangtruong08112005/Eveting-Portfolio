// Compare organizer profile data between Firebase and Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/compare.organizer_profiles.firebase-postgres.js
//   DATABASE_URL=postgres://... ORGANIZER_COMPARE_IDS=uid1,uid2 node scripts/compare.organizer_profiles.firebase-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../providers/database/firebase.organizer.repository');
var postgresRepo = require('../providers/database/postgres.organizer.repository');
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

var matched = 0;
var missingInPostgres = [];
var missingInFirebase = [];
var different = [];

async function compare() {
  var uidList = [];

  var explicitIds = process.env.ORGANIZER_COMPARE_IDS;
  if (explicitIds) {
    uidList = explicitIds.split(',').map(function(s) { return s.trim(); });
    console.log('Comparing ' + uidList.length + ' explicit UIDs');
  } else {
    var snapshot = await admin.firestore().collection('Users').get();
    uidList = snapshot.docs.filter(function(doc) {
      var data = doc.data();
      return data.roles && data.roles.indexOf('organizer') !== -1 && data.organizerInfo;
    }).map(function(d) { return d.id; });
    console.log('Comparing ' + uidList.length + ' organizers');
  }

  var fbMap = {};
  var pgMap = {};

  for (var i = 0; i < uidList.length; i++) {
    var uid = uidList[i];
    try {
      var fbUser = await firebaseRepo.getOrganizerProfile(uid);
      if (fbUser && fbUser.organizerInfo) {
        fbMap[uid] = fbUser.organizerInfo;
      }
    } catch (e) {
      console.warn('Firebase fetch failed for ' + uid + ': ' + e.message);
    }
    try {
      var pgUser = await postgresRepo.getOrganizerProfile(uid);
      if (pgUser && pgUser.organizerInfo) {
        pgMap[uid] = pgUser.organizerInfo;
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
      // Normalize values for comparison
      var fbData = {
        companyName: fbMap[id].companyName,
        taxCode: fbMap[id].taxCode || '',
        description: fbMap[id].description || '',
        website: fbMap[id].website || '',
        status: fbMap[id].status || 'approved'
      };
      var pgData = {
        companyName: pgMap[id].companyName,
        taxCode: pgMap[id].taxCode || '',
        description: pgMap[id].description || '',
        website: pgMap[id].website || '',
        status: pgMap[id].status || 'approved'
      };

      var fbStr = stableStringify(fbData);
      var pgStr = stableStringify(pgData);
      if (fbStr === pgStr) {
        matched++;
      } else {
        different.push({ id: id, firebase: fbData, postgres: pgData });
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
    console.log('    Firebase: ' + JSON.stringify(d.firebase));
    console.log('    Postgres: ' + JSON.stringify(d.postgres));
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
