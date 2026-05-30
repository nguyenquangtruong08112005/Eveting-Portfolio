// Compare analytics data between Firebase and Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/compare.analytics.firebase-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const { db } = require('../../../config/firebase.config');
const firebaseRepo = require('../../../providers/database/firebase.analytics.repository');
const postgresRepo = require('../../../providers/database/postgres.analytics.repository');
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
  const fbSnapshot = await db.collection('Analytics').get();
  const fbMap = {};
  fbSnapshot.forEach(doc => {
    const data = doc.data();
    data.id = doc.id;
    fbMap[doc.id] = data;
  });

  // Fetch all from Postgres
  const pgResult = await query('SELECT * FROM analytics');
  const pgMap = {};
  pgResult.rows.forEach(row => {
    const data = row.raw_data || {};
    data.id = row.id;
    
    // Ensure columns overwrite/backfill raw_data
    data.eventId = row.event_id || row.id;
    if (row.total_revenue != null) data.totalRevenue = Number(row.total_revenue);
    if (row.tickets_sold != null) {
      data.ticketsSold = typeof row.tickets_sold === 'string' ? JSON.parse(row.tickets_sold) : row.tickets_sold;
    }
    if (row.daily_sales != null) {
      data.dailySales = typeof row.daily_sales === 'string' ? JSON.parse(row.daily_sales) : row.daily_sales;
    }
    if (row.check_ins != null) data.checkIns = Number(row.check_ins);
    if (row.views != null) data.views = Number(row.views);
    if (row.views_over_time != null) {
      data.viewsOverTime = typeof row.views_over_time === 'string' ? JSON.parse(row.views_over_time) : row.views_over_time;
    }
    if (row.last_updated_at != null) data.lastUpdatedAt = Number(row.last_updated_at);
    
    pgMap[row.id] = data;
  });

  const allIds = Object.keys(fbMap).concat(Object.keys(pgMap)).filter(function(id, idx, arr) {
    return arr.indexOf(id) === idx;
  }).sort();

  allIds.forEach(function(id) {
    const inFb = id in fbMap;
    const inPg = id in pgMap;
    if (inFb && inPg) {
      const fbData = fbMap[id];
      const pgData = pgMap[id];
      
      const fbClean = {};
      const pgClean = {};
      
      const allKeys = new Set(Object.keys(fbData).concat(Object.keys(pgData)));
      allKeys.forEach(k => {
        let fbVal = fbData[k];
        let pgVal = pgData[k];
        
        if (fbVal === undefined) fbVal = null;
        if (pgVal === undefined) pgVal = null;

        if (k === 'eventId') {
          if (fbVal === null) fbVal = id;
          if (pgVal === null) pgVal = id;
        }
        
        if (k === 'totalRevenue' || k === 'checkIns' || k === 'views') {
          if (fbVal === 0 || fbVal === null) fbVal = 0;
          if (pgVal === 0 || pgVal === null) pgVal = 0;
        }

        if (k === 'ticketsSold' || k === 'dailySales' || k === 'viewsOverTime') {
          const cleanMap = (val) => {
            if (!val) return {};
            const res = {};
            Object.entries(val).forEach(([mapKey, mapVal]) => {
              if (mapVal !== null && mapVal !== undefined && mapVal !== 0) {
                res[mapKey] = Number(mapVal);
              }
            });
            return res;
          };
          fbVal = cleanMap(fbVal);
          pgVal = cleanMap(pgVal);
          
          if (Object.keys(fbVal).length === 0) fbVal = {};
          if (Object.keys(pgVal).length === 0) pgVal = {};
        }

        if (k === 'lastUpdatedAt') {
          return;
        }

        if (fbVal !== null && fbVal !== undefined && (typeof fbVal !== 'object' || Object.keys(fbVal).length > 0)) {
          fbClean[k] = fbVal;
        }
        if (pgVal !== null && pgVal !== undefined && (typeof pgVal !== 'object' || Object.keys(pgVal).length > 0)) {
          pgClean[k] = pgVal;
        }
      });

      const fbStr = stableStringify(fbClean);
      const pgStr = stableStringify(pgClean);
      
      if (fbStr === pgStr) {
        matched++;
      } else {
        different.push({ id: id, firebase: fbClean, postgres: pgClean });
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

  const smokeId = 'evt_haanh_show_dalat_2026';
  console.log('Performing exact shape checks for smoke ID: ' + smokeId);
  const fbSmoke = await firebaseRepo.getAnalyticsByEventId(smokeId);
  const pgSmoke = await postgresRepo.getAnalyticsByEventId(smokeId);

  if (fbSmoke && pgSmoke) {
    const fbKeys = Object.keys(fbSmoke).sort();
    const pgKeys = Object.keys(pgSmoke).sort();
    console.log('Firebase keys for ' + smokeId + ': ' + fbKeys.join(', '));
    console.log('Postgres keys for ' + smokeId + ': ' + pgKeys.join(', '));
    if (JSON.stringify(fbKeys) !== JSON.stringify(pgKeys)) {
      console.error('SMOKE ID SHAPE MISMATCH: getAnalyticsByEventId keys do not match!');
      process.exit(1);
    }

    const fbList = await firebaseRepo.getAnalyticsByEventIds([smokeId]);
    const pgList = await postgresRepo.getAnalyticsByEventIds([smokeId]);
    if (!fbList.length || !pgList.length) {
      console.error('SMOKE ID ERROR: getAnalyticsByEventIds returned empty list!');
      process.exit(1);
    }
    const fbListKeys = Object.keys(fbList[0]).sort();
    const pgListKeys = Object.keys(pgList[0]).sort();
    if (JSON.stringify(fbListKeys) !== JSON.stringify(pgListKeys)) {
      console.error('SMOKE ID SHAPE MISMATCH: getAnalyticsByEventIds keys do not match!');
      process.exit(1);
    }
    console.log('Exact shape check passed for ' + smokeId);
  } else {
    console.warn('Smoke ID ' + smokeId + ' not found in databases, skipping exact shape check.');
  }

  const hasDiff = missingInPostgres.length > 0 || missingInFirebase.length > 0 || different.length > 0;
  if (hasDiff) {
    process.exit(1);
  }
}

compare().catch(function(err) {
  console.error('Compare failed: ' + err.message);
  process.exit(1);
});
