// scripts/smoke.postgres-write-paths.js
// Controlled Postgres write-path smoke test for Phase C8
// Usage:
//   DATABASE_URL=postgres://... node scripts/smoke.postgres-write-paths.js

require('dotenv').config({ quiet: true });

// 1) Require DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

// 2) Set provider env variables before requiring services/repositories
process.env.DATABASE_PROVIDER = 'postgres';
process.env.EVENT_DATABASE_PROVIDER = 'postgres';
process.env.ADMIN_DATABASE_PROVIDER = 'postgres';
process.env.FEATURED_PROFILE_DATABASE_PROVIDER = 'postgres';

// Setup ASCII and secret redaction logger wrapper
const originalLog = console.log;
const originalError = console.error;
const tokensToRedact = new Set();

const databaseUrl = process.env.DATABASE_URL || '';
const dbPassMatch = databaseUrl.match(/postgres(?:ql)?:\/\/[^:]+:([^@]+)@/);
if (dbPassMatch && dbPassMatch[1]) {
  tokensToRedact.add(dbPassMatch[1]);
}

function redactDatabaseUrl(url) {
  if (typeof url !== 'string') return url;
  return url.replace(/(postgres(?:ql)?:\/\/[^/:]+:)([^@/]+)(@.*)/g, '$1[REDACTED]$3');
}

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  let result = redactDatabaseUrl(str);
  for (const token of tokensToRedact) {
    if (token && token.length > 5) {
      result = result.split(token).join('[REDACTED]');
    }
  }
  // Strip non-ASCII characters
  return result.replace(/[^\x00-\x7F]/g, '');
}

function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  const sanitized = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitiveKey = key.toLowerCase().includes('token') || 
                           key.toLowerCase().includes('password') || 
                           key.toLowerCase().includes('secret');
    if (isSensitiveKey && typeof value === 'string') {
      tokensToRedact.add(value);
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

console.log = function(...args) {
  originalLog.apply(console, args.map(arg => {
    if (typeof arg === 'string') return sanitizeString(arg);
    return sanitizeObject(arg);
  }));
};

console.error = function(...args) {
  originalError.apply(console, args.map(arg => {
    if (typeof arg === 'string') return sanitizeString(arg);
    return sanitizeObject(arg);
  }));
};

// Require repositories/services AFTER setting provider envs
require('../src/alias-bootstrap');
const eventRepository = require('../src/providers/database/event.repository');
const adminService = require('../src/services/admin.service');
const { query, getPool } = require('../src/providers/database/postgres.client');

async function run() {
  console.log('--- Starting Phase C8 Postgres Write-Paths Smoke Test ---');

  const eventId1 = 'smoke_evt_app_' + Date.now();
  const eventId2 = 'smoke_evt_rej_' + Date.now();

  // 3) Create two synthetic pending events with no featuredProfileIds
  const syntheticEvent1 = {
    name: 'Smoke Test Event Approve',
    description: 'Synthetic event for approve verification',
    status: 'pending',
    visibility: 'private',
    featuredProfileIds: [],
    date: Date.now(),
    createdAt: Date.now(),
    lastUpdatedAt: Date.now()
  };

  const syntheticEvent2 = {
    name: 'Smoke Test Event Reject',
    description: 'Synthetic event for reject verification',
    status: 'pending',
    visibility: 'private',
    featuredProfileIds: [],
    date: Date.now(),
    createdAt: Date.now(),
    lastUpdatedAt: Date.now()
  };

  try {
    console.log('Creating synthetic event 1 (Approve Path)...');
    await eventRepository.createEvent(eventId1, syntheticEvent1);

    console.log('Creating synthetic event 2 (Reject Path)...');
    await eventRepository.createEvent(eventId2, syntheticEvent2);

    // 4) Call adminService.approveEvent on one and verify
    console.log('Approving synthetic event 1...');
    const approveResult = await adminService.approveEvent(eventId1);
    console.log('Approve response:', approveResult);

    console.log('Verifying event 1 columns and raw_data in Postgres...');
    const dbApproveRes = await query('SELECT * FROM events WHERE id = $1', [eventId1]);
    if (dbApproveRes.rows.length === 0) {
      throw new Error('Verification failed: Approved event not found in Postgres.');
    }
    const approvedRow = dbApproveRes.rows[0];

    const status1 = approvedRow.status;
    const visibility1 = approvedRow.visibility;
    const rawData1 = approvedRow.raw_data || {};
    const approvedAt1 = rawData1.approvedAt;
    const lastUpdatedAt1 = Number(approvedRow.last_updated_at);

    console.log(`- status: ${status1} (expected: active)`);
    console.log(`- visibility: ${visibility1} (expected: public)`);
    console.log(`- approvedAt: ${approvedAt1} (expected: number)`);
    console.log(`- lastUpdatedAt: ${lastUpdatedAt1} (expected: number)`);

    if (status1 !== 'active') throw new Error(`Expected status 'active', got ${status1}`);
    if (visibility1 !== 'public') throw new Error(`Expected visibility 'public', got ${visibility1}`);
    if (typeof approvedAt1 !== 'number') throw new Error(`Expected approvedAt to be a number, got ${typeof approvedAt1}`);
    if (isNaN(lastUpdatedAt1) || lastUpdatedAt1 <= 0) throw new Error(`Expected lastUpdatedAt to be a valid number, got ${lastUpdatedAt1}`);

    // 5) Call adminService.rejectEvent on the other with a reason and verify
    const rejectReason = 'Smoke test reject reason';
    console.log('Rejecting synthetic event 2...');
    const rejectResult = await adminService.rejectEvent(eventId2, rejectReason);
    console.log('Reject response:', rejectResult);

    console.log('Verifying event 2 columns and raw_data in Postgres...');
    const dbRejectRes = await query('SELECT * FROM events WHERE id = $1', [eventId2]);
    if (dbRejectRes.rows.length === 0) {
      throw new Error('Verification failed: Rejected event not found in Postgres.');
    }
    const rejectedRow = dbRejectRes.rows[0];

    const status2 = rejectedRow.status;
    const rawData2 = rejectedRow.raw_data || {};
    const rejectReason2 = rawData2.rejectReason;
    const rejectedAt2 = rawData2.rejectedAt;
    const lastUpdatedAt2 = Number(rejectedRow.last_updated_at);

    console.log(`- status: ${status2} (expected: rejected)`);
    console.log(`- rejectReason: ${rejectReason2} (expected: "${rejectReason}")`);
    console.log(`- rejectedAt: ${rejectedAt2} (expected: number)`);
    console.log(`- lastUpdatedAt: ${lastUpdatedAt2} (expected: number)`);

    if (status2 !== 'rejected') throw new Error(`Expected status 'rejected', got ${status2}`);
    if (rejectReason2 !== rejectReason) throw new Error(`Expected rejectReason "${rejectReason}", got "${rejectReason2}"`);
    if (typeof rejectedAt2 !== 'number') throw new Error(`Expected rejectedAt to be a number, got ${typeof rejectedAt2}`);
    if (isNaN(lastUpdatedAt2) || lastUpdatedAt2 <= 0) throw new Error(`Expected lastUpdatedAt to be a valid number, got ${lastUpdatedAt2}`);

    console.log('--- Phase C8 Postgres Write-Paths Smoke Test Passed Successfully ---');
  } finally {
    // 6) Cleanup synthetic rows in finally block
    console.log('Cleaning up synthetic rows in Postgres...');
    try {
      await query('DELETE FROM events WHERE id IN ($1, $2)', [eventId1, eventId2]);
      console.log('Cleanup finished.');
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr.message);
    }

    // Close database pool connections
    await getPool().end();
  }
}

run().catch(err => {
  console.error('Smoke test execution failed:', err.message);
  process.exit(1);
});
