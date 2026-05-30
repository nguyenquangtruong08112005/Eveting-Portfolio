// Compare pending admin events between Firebase and Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/compare.admin.firebase-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const firebaseRepo = require('../../../providers/database/firebase.admin.repository');
const postgresRepo = require('../../../providers/database/postgres.admin.repository');

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

async function compare() {
  const page = 1;
  const limit = 20;

  console.log(`Fetching pending events from Firebase (page ${page}, limit ${limit})...`);
  const fbEvents = await firebaseRepo.getPendingEvents(page, limit);

  console.log(`Fetching pending events from Postgres (page ${page}, limit ${limit})...`);
  const pgEvents = await postgresRepo.getPendingEvents(page, limit);

  const fbMap = {};
  fbEvents.forEach(e => { fbMap[e.id] = e; });

  const pgMap = {};
  pgEvents.forEach(e => { pgMap[e.id] = e; });

  let matched = 0;
  const missingInPostgres = [];
  const missingInFirebase = [];
  const different = [];

  const allIds = Object.keys(fbMap).concat(Object.keys(pgMap)).filter(function(id, idx, arr) {
    return arr.indexOf(id) === idx;
  }).sort();

  allIds.forEach(function(id) {
    const inFb = id in fbMap;
    const inPg = id in pgMap;
    if (inFb && inPg) {
      const fbStr = stableStringify(fbMap[id]);
      const pgStr = stableStringify(pgMap[id]);
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

  console.log('Comparison Results for First Page:');
  console.log('  matched: ' + matched);
  console.log('  missing in postgres: ' + missingInPostgres.length);
  console.log('  missing in firebase: ' + missingInFirebase.length);
  console.log('  different: ' + different.length);

  missingInPostgres.forEach(function(id) {
    console.log('  MISSING-PG: ' + id);
  });
  missingInFirebase.forEach(function(id) {
    console.log('  MISSING-FB: ' + id);
  });
  different.forEach(function(d) {
    console.log('  DIFFERENT: ' + d.id);
    console.log('    Firebase payload: ', JSON.stringify(d.firebase));
    console.log('    Postgres payload: ', JSON.stringify(d.postgres));
  });

  const hasDiff = missingInPostgres.length > 0 || missingInFirebase.length > 0 || different.length > 0;
  if (hasDiff) {
    console.error('[FAIL] Comparison failed: Mismatches detected between Firebase and Postgres pending lists.');
    process.exit(1);
  } else {
    console.log('[OK] Comparison complete. Firebase and Postgres pending lists match perfectly!');
    process.exit(0);
  }
}

compare().catch(function(err) {
  console.error('Compare failed: ' + (err.stack || err.message));
  process.exit(1);
});
