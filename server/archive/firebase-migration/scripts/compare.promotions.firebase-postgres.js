// Compare promotion data between Firebase and Postgres.
// Compares active public promotions and optionally organizer with PROMOTION_SMOKE_ORGANIZER_ID.
// Usage:
//   DATABASE_URL=postgres://... node scripts/compare.promotions.firebase-postgres.js
//   DATABASE_URL=postgres://... PROMOTION_SMOKE_ORGANIZER_ID=<id> node scripts/compare.promotions.firebase-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

var firebaseRepo = require('../../../providers/database/firebase.promotion.repository');
var postgresRepo = require('../../../providers/database/postgres.promotion.repository');

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

function sortById(promos) {
  return promos.slice().sort(function(a, b) {
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
}

var matched = 0;
var missingInPostgres = [];
var missingInFirebase = [];
var different = [];

async function getAllPromotionsForCompare(repo) {
  var active = await repo.getActivePromotions();
  var map = {};
  active.forEach(function(p) { map[p.id] = p; });

  var smokeId = process.env.PROMOTION_SMOKE_ORGANIZER_ID;
  if (smokeId) {
    var orgPromos = await repo.getPromotionsByOrganizer(smokeId);
    orgPromos.forEach(function(p) { map[p.id] = p; });
  }

  return map;
}

async function compare() {
  var fbMap = await getAllPromotionsForCompare(firebaseRepo);
  var pgMap = await getAllPromotionsForCompare(postgresRepo);

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

  var smokeId = process.env.PROMOTION_SMOKE_ORGANIZER_ID;
  if (smokeId) {
    console.log('\nPROMOTION_SMOKE_ORGANIZER_ID=' + smokeId);
    var fbPromos = await firebaseRepo.getPromotionsByOrganizer(smokeId);
    var pgPromos = await postgresRepo.getPromotionsByOrganizer(smokeId);
    console.log('  firebase: ' + fbPromos.length + ' promotions');
    console.log('  postgres: ' + pgPromos.length + ' promotions');
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
