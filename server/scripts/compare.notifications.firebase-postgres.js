// Compare notification data between Firebase and Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/compare.notifications.firebase-postgres.js
//   DATABASE_URL=postgres://... NOTIFICATION_SMOKE_USER_ID=<id> node scripts/compare.notifications.firebase-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../providers/database/firebase.notification.repository');
var postgresRepo = require('../providers/database/postgres.notification.repository');

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
  var smokeId = process.env.NOTIFICATION_SMOKE_USER_ID || 'user_alice';

  var firebaseNotifs = await firebaseRepo.getNotificationsByUserId(smokeId);
  var postgresNotifs = await postgresRepo.getNotificationsByUserId(smokeId);

  var fbMap = {};
  firebaseNotifs.forEach(function(n) { fbMap[n.id] = n; });
  var pgMap = {};
  postgresNotifs.forEach(function(n) { pgMap[n.id] = n; });

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
