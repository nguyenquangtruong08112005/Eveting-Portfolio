// Compare event data between Firebase and Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/compare.events.firebase-postgres.js
//   DATABASE_URL=postgres://... EVENT_SMOKE_ID=<id> node scripts/compare.events.firebase-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const { db } = require('../../../config/firebase.config');
const firebaseRepo = require('../../../providers/database/firebase.event.repository');
const postgresRepo = require('../../../providers/database/postgres.event.repository');
const { query } = require('../../../providers/database/postgres.client');

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

let matched = 0;
const missingInPostgres = [];
const missingInFirebase = [];
const different = [];

async function compare() {
  // Fetch all from Firebase
  const fbSnapshot = await db.collection('Events').get();
  const fbMap = {};
  fbSnapshot.forEach(doc => {
    const data = doc.data();
    data.id = doc.id;
    // Normalize fields for stable comparison
    fbMap[doc.id] = data;
  });

  // Fetch all from Postgres
  const pgResult = await query('SELECT * FROM events');
  const pgMap = {};
  pgResult.rows.forEach(row => {
    // Reconstruct matching doc
    const data = row.raw_data || {};
    data.id = row.id;
    pgMap[row.id] = data;
  });

  const allIds = Object.keys(fbMap).concat(Object.keys(pgMap)).filter(function(id, idx, arr) {
    return arr.indexOf(id) === idx;
  }).sort();

  allIds.forEach(function(id) {
    const inFb = id in fbMap;
    const inPg = id in pgMap;
    if (inFb && inPg) {
      // Remove any timestamps that might naturally drift or check exact match of fields
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

  const smokeId = process.env.EVENT_SMOKE_ID || 'evt_vdf_hcm_2025';
  if (smokeId) {
    console.log('\nEVENT_SMOKE_ID=' + smokeId);
    const fbEvent = await firebaseRepo.getEventById(smokeId);
    const pgEvent = await postgresRepo.getEventById(smokeId);
    const fbFound = fbEvent !== null;
    const pgFound = pgEvent !== null;
    console.log('  firebase: ' + (fbFound ? 'found' : 'not found'));
    console.log('  postgres: ' + (pgFound ? 'found' : 'not found'));
    if (fbFound && pgFound) {
      const fbStr = stableStringify(fbEvent);
      const pgStr = stableStringify(pgEvent);
      if (fbStr === pgStr) {
        console.log('  getEventById: MATCH');
      } else {
        console.log('  getEventById: DIFFERENT');
      }
    }
  }

  // Compare getPublicEventsPage projection
  console.log('\nComparing getPublicEventsPage (page 1, limit 10)...');
  const fbPublicPage = await firebaseRepo.getPublicEventsPage(1, 10);
  const pgPublicPage = await postgresRepo.getPublicEventsPage(1, 10);

  let publicPageMatch = true;
  if (fbPublicPage.totalItems !== pgPublicPage.totalItems) {
    console.log('  DIFFERENT totalItems: Firebase=' + fbPublicPage.totalItems + ', Postgres=' + pgPublicPage.totalItems);
    publicPageMatch = false;
  } else {
    console.log('  MATCH totalItems: ' + fbPublicPage.totalItems);
  }

  const fbPublicStr = stableStringify(fbPublicPage.entries);
  const pgPublicStr = stableStringify(pgPublicPage.entries);

  if (fbPublicStr === pgPublicStr) {
    console.log('  getPublicEventsPage entries: MATCH');
  } else {
    console.log('  getPublicEventsPage entries: DIFFERENT');
    publicPageMatch = false;
    // Print a quick preview of differences
    if (fbPublicPage.entries[0] && fbPublicPage.entries[0].data) {
      console.log('  Firebase entry data keys:', Object.keys(fbPublicPage.entries[0].data).sort());
    }
    if (pgPublicPage.entries[0] && pgPublicPage.entries[0].data) {
      console.log('  Postgres entry data keys:', Object.keys(pgPublicPage.entries[0].data).sort());
    }
  }

  const hasDiff = missingInPostgres.length > 0 || missingInFirebase.length > 0 || different.length > 0 || !publicPageMatch;
  if (hasDiff) {
    process.exit(1);
  }
}

compare().catch(function(err) {
  console.error('Compare failed: ' + err.message);
  process.exit(1);
});
