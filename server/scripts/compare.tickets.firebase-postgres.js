// Compare ticket data between Firebase and Postgres
// Usage:
//   DATABASE_URL=postgres://... node scripts/compare.tickets.firebase-postgres.js
//   DATABASE_URL=postgres://... TICKET_SMOKE_ID=<id> node scripts/compare.tickets.firebase-postgres.js

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const { db } = require('../config/firebase.config');
const firebaseRepo = require('../providers/database/firebase.ticket.repository');
const postgresRepo = require('../providers/database/postgres.ticket.repository');
const { query } = require('../providers/database/postgres.client');

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

function cleanTicket(ticket) {
  if (!ticket) return {};
  const clean = {};
  Object.keys(ticket).forEach(k => {
    let val = ticket[k];
    if (val === undefined) val = null;
    
    if (k === 'checkInCount') {
      if (val === 0 || val === null) val = 0;
    }
    if (k === 'quantity') {
      if (val === 1 || val === null || val === 0) val = 1;
    }
    if (k === 'unitPrice' || k === 'price' || k === 'originalPrice') {
      if (val === 0 || val === null) val = 0;
    }
    
    if (val !== null && val !== undefined) {
      clean[k] = val;
    }
  });
  return clean;
}

let matched = 0;
const missingInPostgres = [];
const missingInFirebase = [];
const different = [];

async function compare() {
  // Fetch all from Firebase
  const fbSnapshot = await db.collection('Tickets').get();
  const fbMap = {};
  fbSnapshot.forEach(doc => {
    const data = doc.data();
    data.id = doc.id;
    fbMap[doc.id] = data;
  });

  // Fetch all from Postgres
  const pgResult = await query('SELECT * FROM tickets');
  const pgMap = {};
  pgResult.rows.forEach(row => {
    const data = row.raw_data || {};
    data.id = row.id;
    
    // Ensure columns overwrite/backfill raw_data
    data.eventId = row.event_id;
    data.userId = row.user_id;
    if (row.organizer_id) data.organizerId = row.organizer_id;
    data.type = row.type;
    if (row.price != null) data.price = Number(row.price);
    if (row.original_price != null) data.originalPrice = Number(row.original_price);
    if (row.quantity != null) data.quantity = Number(row.quantity);
    if (row.unit_price != null) data.unitPrice = Number(row.unit_price);
    if (row.applied_promo_code != null) data.appliedPromoCode = row.applied_promo_code;
    if (row.seat != null) data.seat = row.seat;
    if (row.qr_code != null) data.qrCode = row.qr_code;
    if (row.status != null) data.status = row.status;
    if (row.purchase_date != null) data.purchaseDate = Number(row.purchase_date);
    if (row.group_id != null) data.groupId = row.group_id;
    if (row.check_in_count != null) data.checkInCount = Number(row.check_in_count);
    if (row.last_check_in_at != null) data.lastCheckInAt = Number(row.last_check_in_at);
    if (row.checked_in_at != null) data.checkedInAt = Number(row.checked_in_at);
    if (row.payment_time != null) data.paymentTime = Number(row.payment_time);
    if (row.updated_at != null) data.updatedAt = Number(row.updated_at);
    
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
        
        // Normalize checkInCount: null/undefined/0 are equivalent
        if (k === 'checkInCount') {
          if (fbVal === 0 || fbVal === null) fbVal = 0;
          if (pgVal === 0 || pgVal === null) pgVal = 0;
        }
        
        // Normalize quantity: null/undefined/1 are equivalent
        if (k === 'quantity') {
          if (fbVal === 1 || fbVal === null || fbVal === 0) fbVal = 1;
          if (pgVal === 1 || pgVal === null || pgVal === 0) pgVal = 1;
        }
        
        // Normalize price fields: null/undefined/0 are equivalent
        if (k === 'unitPrice' || k === 'price' || k === 'originalPrice') {
          if (fbVal === 0 || fbVal === null) fbVal = 0;
          if (pgVal === 0 || pgVal === null) pgVal = 0;
        }
        
        if (fbVal !== null && fbVal !== undefined) fbClean[k] = fbVal;
        if (pgVal !== null && pgVal !== undefined) pgClean[k] = pgVal;
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

  const smokeId = process.env.TICKET_SMOKE_ID || 'tkt_alice_vdf_1';
  if (smokeId) {
    console.log('\nTICKET_SMOKE_ID=' + smokeId);
    const fbTicket = await firebaseRepo.getTicketById(smokeId);
    const pgTicket = await postgresRepo.getTicketById(smokeId);
    const fbFound = fbTicket !== null;
    const pgFound = pgTicket !== null;
    console.log('  firebase: ' + (fbFound ? 'found' : 'not found'));
    console.log('  postgres: ' + (pgFound ? 'found' : 'not found'));
    if (fbFound && pgFound) {
      const fbClean = {};
      const pgClean = {};
      const allKeys = new Set(Object.keys(fbTicket).concat(Object.keys(pgTicket)));
      allKeys.forEach(k => {
        let fbVal = fbTicket[k];
        let pgVal = pgTicket[k];
        
        if (fbVal === undefined) fbVal = null;
        if (pgVal === undefined) pgVal = null;
        
        if (k === 'checkInCount') {
          if (fbVal === 0 || fbVal === null) fbVal = 0;
          if (pgVal === 0 || pgVal === null) pgVal = 0;
        }
        if (k === 'quantity') {
          if (fbVal === 1 || fbVal === null || fbVal === 0) fbVal = 1;
          if (pgVal === 1 || pgVal === null || pgVal === 0) pgVal = 1;
        }
        if (k === 'unitPrice' || k === 'price' || k === 'originalPrice') {
          if (fbVal === 0 || fbVal === null) fbVal = 0;
          if (pgVal === 0 || pgVal === null) pgVal = 0;
        }
        
        if (fbVal !== null && fbVal !== undefined) fbClean[k] = fbVal;
        if (pgVal !== null && pgVal !== undefined) pgClean[k] = pgVal;
      });

      const fbStr = stableStringify(fbClean);
      const pgStr = stableStringify(pgClean);
      if (fbStr === pgStr) {
        console.log('  getTicketById: MATCH');
      } else {
        console.log('  getTicketById: DIFFERENT');
        console.log('    Firebase:', fbClean);
        console.log('    Postgres:', pgClean);
      }
    }
  }

  let paidOrAttendeeDiff = false;
  let realEventId = null;
  for (const id in fbMap) {
    const t = fbMap[id];
    if (t && t.eventId && (t.status === 'paid' || t.status === 'checkedIn')) {
      realEventId = t.eventId;
      break;
    }
  }
  if (!realEventId) {
    for (const id in fbMap) {
      if (fbMap[id] && fbMap[id].eventId) {
        realEventId = fbMap[id].eventId;
        break;
      }
    }
  }

  if (realEventId) {
    console.log('\nComparing paid/attendee method shapes for event: ' + realEventId);
    
    const fbPaid = await firebaseRepo.getPaidTicketsByEventId(realEventId);
    const pgPaid = await postgresRepo.getPaidTicketsByEventId(realEventId);
    
    const fbPaidClean = fbPaid.map(cleanTicket).map(stableStringify).sort();
    const pgPaidClean = pgPaid.map(cleanTicket).map(stableStringify).sort();
    
    let paidMatch = fbPaidClean.length === pgPaidClean.length;
    if (paidMatch) {
      for (let i = 0; i < fbPaidClean.length; i++) {
        if (fbPaidClean[i] !== pgPaidClean[i]) {
          paidMatch = false;
          break;
        }
      }
    }
    
    if (paidMatch) {
      console.log('  getPaidTicketsByEventId: MATCH (' + fbPaid.length + ' tickets)');
    } else {
      console.log('  getPaidTicketsByEventId: DIFFERENT');
      console.log('    Firebase count: ' + fbPaid.length);
      console.log('    Postgres count: ' + pgPaid.length);
      console.log('    Firebase:', fbPaidClean);
      console.log('    Postgres:', pgPaidClean);
      paidOrAttendeeDiff = true;
    }
    
    const fbAttendee = await firebaseRepo.getAttendeeTicketsByEventId(realEventId);
    const pgAttendee = await postgresRepo.getAttendeeTicketsByEventId(realEventId);
    
    const fbAttendeeClean = fbAttendee.map(cleanTicket).map(stableStringify).sort();
    const pgAttendeeClean = pgAttendee.map(cleanTicket).map(stableStringify).sort();
    
    let attendeeMatch = fbAttendeeClean.length === pgAttendeeClean.length;
    if (attendeeMatch) {
      for (let i = 0; i < fbAttendeeClean.length; i++) {
        if (fbAttendeeClean[i] !== pgAttendeeClean[i]) {
          attendeeMatch = false;
          break;
        }
      }
    }
    
    if (attendeeMatch) {
      console.log('  getAttendeeTicketsByEventId: MATCH (' + fbAttendee.length + ' tickets)');
    } else {
      console.log('  getAttendeeTicketsByEventId: DIFFERENT');
      console.log('    Firebase count: ' + fbAttendee.length);
      console.log('    Postgres count: ' + pgAttendee.length);
      console.log('    Firebase:', fbAttendeeClean);
      console.log('    Postgres:', pgAttendeeClean);
      paidOrAttendeeDiff = true;
    }
  } else {
    console.log('\nWarning: No tickets found in Firebase to extract a real event ID for method shape comparison.');
  }

  const hasDiff = missingInPostgres.length > 0 || missingInFirebase.length > 0 || different.length > 0 || paidOrAttendeeDiff;
  if (hasDiff) {
    process.exit(1);
  }
}

compare().catch(function(err) {
  console.error('Compare failed: ' + err.message);
  process.exit(1);
});
