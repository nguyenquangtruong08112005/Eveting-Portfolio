// Compare venue data between Firebase and Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/compare.venues.firebase-postgres.js
//   DATABASE_URL=postgres://... VENUE_SMOKE_ID=<id> node scripts/compare.venues.firebase-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../providers/database/firebase.venue.repository');
var postgresRepo = require('../providers/database/postgres.venue.repository');

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

function sortById(venues) {
  return venues.slice().sort(function(a, b) {
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
  var firebaseVenues = await firebaseRepo.getAllVenues();
  var postgresVenues = await postgresRepo.getAllVenues();

  var fbMap = {};
  firebaseVenues.forEach(function(v) { fbMap[v.id] = v; });
  var pgMap = {};
  postgresVenues.forEach(function(v) { pgMap[v.id] = v; });

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

  var smokeId = process.env.VENUE_SMOKE_ID;
  if (smokeId) {
    console.log('\nVENUE_SMOKE_ID=' + smokeId);
    var fbVenue = await firebaseRepo.getVenueById(smokeId);
    var pgVenue = await postgresRepo.getVenueById(smokeId);
    var fbFound = fbVenue !== null;
    var pgFound = pgVenue !== null;
    console.log('  firebase: ' + (fbFound ? 'found' : 'not found'));
    console.log('  postgres: ' + (pgFound ? 'found' : 'not found'));
    if (fbFound && pgFound) {
      var fbStr = stableStringify(fbVenue);
      var pgStr = stableStringify(pgVenue);
      if (fbStr === pgStr) {
        console.log('  getVenueById: MATCH');
      } else {
        console.log('  getVenueById: DIFFERENT');
      }
    }
  }

  var hasDiff = missingInPostgres.length > 0 || missingInFirebase.length > 0 || different.length > 0;
  if (hasDiff) {
    process.exit(1);
  }
}

compare().catch(function(err) {
  console.error('Compare failed: ' + err.message);
  process.exit(1);
});
