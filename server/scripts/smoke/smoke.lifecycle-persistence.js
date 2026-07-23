require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.DATABASE_PROVIDER = 'postgres';
process.env.EVENT_DATABASE_PROVIDER = 'postgres';
process.env.ADMIN_DATABASE_PROVIDER = 'postgres';
process.env.FEATURED_PROFILE_DATABASE_PROVIDER = 'postgres';

require('../../src/alias-bootstrap');

const { v4: uuidv4 } = require('uuid');
const { query, getPool } = require('@/providers/database/postgres.client');
const eventRepository = require('@/providers/database/event.repository');
const adminService = require('@/modules/admin/application/service');
const eventService = require('@/modules/events/application/service');
const { STATUS, VISIBILITY, LIFECYCLE } = require('@/modules/events/domain/event-lifecycle');

const PASS = [];
const FAIL = [];

function assert(condition, msg) {
  if (!condition) {
    FAIL.push(msg);
    console.error('  [FAIL] ' + msg);
  } else {
    PASS.push(msg);
    console.log('  [PASS] ' + msg);
  }
}

async function run() {
  const syntheticIds = [];
  const now = Date.now();

  function sid(prefix) {
    const id = `lc_persist_${prefix}_${uuidv4().slice(0, 8)}`;
    syntheticIds.push(id);
    return id;
  }

  try {
    console.log('--- Phase P1.2-S3 Lifecycle Persistence Smoke Test ---');
    console.log('');

    // ===================================================================
    // Section 1: Create event via service -> lifecycle_status = submitted
    //            lifecycleStatus must NOT leak into returned event object
    //            NOR into raw_data. Only the column stores it.
    // ===================================================================
    console.log('--- Section 1: Create event lifecycle ---');

    const created = await eventService.createEvent({
      name: 'Lifecycle Smoke Event',
      description: 'Testing lifecycle_status persistence',
      date: now + 86400000,
      eventType: 'online',
      onlineUrl: 'https://example.com/live',
      ticketTypes: { vip: { name: 'VIP', price: 100, available: 10 } },
    }, 'smoke_organizer');
    const createdId = created.id;
    syntheticIds.push(createdId);

    assert(created.status === STATUS.PENDING, 'create: legacy status is pending');
    assert(created.visibility === VISIBILITY.PRIVATE, 'create: legacy visibility is private');
    assert(created.lifecycleStatus === undefined, 'create: lifecycleStatus NOT exposed in returned event');

    const dbCreate = await query(
      "SELECT lifecycle_status, status, visibility, raw_data->>'lifecycleStatus' AS raw_ls FROM events WHERE id = $1",
      [createdId]
    );
    assert(dbCreate.rows.length === 1, 'create: row found in DB');
    assert(dbCreate.rows[0].lifecycle_status === LIFECYCLE.SUBMITTED, 'create: lifecycle_status column is submitted');
    assert(dbCreate.rows[0].status === STATUS.PENDING, 'create: status column is pending');
    assert(dbCreate.rows[0].visibility === VISIBILITY.PRIVATE, 'create: visibility column is private');
    assert(dbCreate.rows[0].raw_ls === null, 'create: raw_data does NOT contain lifecycleStatus');

    const repoCreated = await eventRepository.getEventDataById(createdId);
    assert(repoCreated.lifecycleStatus === undefined, 'create: repo event data does NOT expose lifecycleStatus');
    assert(repoCreated.status === STATUS.PENDING, 'create: repo returns legacy status');

    // ===================================================================
    // Section 2: Approve event -> column lifecycle_status = published
    //            returned data must NOT expose lifecycleStatus
    // ===================================================================
    console.log('--- Section 2: Approve event lifecycle ---');

    await adminService.approveEvent(createdId);
    const afterApprove = await query(
      'SELECT lifecycle_status, status, visibility FROM events WHERE id = $1',
      [createdId]
    );
    assert(afterApprove.rows[0].lifecycle_status === LIFECYCLE.PUBLISHED, 'approve: lifecycle_status column is published');
    assert(afterApprove.rows[0].status === STATUS.ACTIVE, 'approve: status column is active');
    assert(afterApprove.rows[0].visibility === VISIBILITY.PUBLIC, 'approve: visibility column is public');

    const repoApprove = await eventRepository.getEventDataById(createdId);
    assert(repoApprove.lifecycleStatus === undefined, 'approve: repo event data does NOT expose lifecycleStatus');
    assert(repoApprove.status === STATUS.ACTIVE, 'approve: repo returns legacy status');
    assert(repoApprove.visibility === VISIBILITY.PUBLIC, 'approve: repo returns legacy visibility');

    // Verify raw_data was NOT polluted by lifecycleStatus during update
    const rawAfterApprove = await query(
      "SELECT raw_data->>'lifecycleStatus' AS raw_ls FROM events WHERE id = $1",
      [createdId]
    );
    assert(rawAfterApprove.rows[0].raw_ls === null, 'approve: raw_data still does NOT contain lifecycleStatus');

    // ===================================================================
    // Section 3: Reject event -> column lifecycle_status = rejected
    // ===================================================================
    console.log('--- Section 3: Reject event lifecycle ---');

    const rejectId = sid('rej');
    await query(
      `INSERT INTO events (id, name, start_at, status, visibility, created_at, last_updated_at, raw_data, lifecycle_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [rejectId, 'Reject Lifecycle Test', now + 86400000, STATUS.PENDING, VISIBILITY.PRIVATE, now, now,
       JSON.stringify({ name: 'Reject Lifecycle Test', date: now + 86400000, status: STATUS.PENDING, visibility: VISIBILITY.PRIVATE }),
       LIFECYCLE.SUBMITTED]
    );

    await adminService.rejectEvent(rejectId, 'Policy violation');
    const afterReject = await query(
      'SELECT lifecycle_status, status FROM events WHERE id = $1',
      [rejectId]
    );
    assert(afterReject.rows[0].lifecycle_status === LIFECYCLE.REJECTED, 'reject: lifecycle_status column is rejected');
    assert(afterReject.rows[0].status === STATUS.REJECTED, 'reject: status column is rejected');

    const repoReject = await eventRepository.getEventDataById(rejectId);
    assert(repoReject.lifecycleStatus === undefined, 'reject: repo event data does NOT expose lifecycleStatus');
    assert(repoReject.status === STATUS.REJECTED, 'reject: repo returns legacy status');

    // ===================================================================
    // Section 4: Cancel event -> column lifecycle_status = cancelled
    // ===================================================================
    console.log('--- Section 4: Cancel event lifecycle ---');

    const cancelId = sid('can');
    await query(
      `INSERT INTO events (id, name, start_at, status, visibility, created_at, last_updated_at, raw_data, lifecycle_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [cancelId, 'Cancel Lifecycle Test', now + 86400000, STATUS.ACTIVE, VISIBILITY.PUBLIC, now, now,
       JSON.stringify({ name: 'Cancel Lifecycle Test', date: now + 86400000, status: STATUS.ACTIVE, visibility: VISIBILITY.PUBLIC }),
       LIFECYCLE.PUBLISHED]
    );

    await eventService.cancelEvent(cancelId);
    const afterCancel = await query(
      'SELECT lifecycle_status, status FROM events WHERE id = $1',
      [cancelId]
    );
    assert(afterCancel.rows[0].lifecycle_status === LIFECYCLE.CANCELLED, 'cancel: lifecycle_status column is cancelled');
    assert(afterCancel.rows[0].status === STATUS.CANCELLED, 'cancel: status column is cancelled');

    const repoCancel = await eventRepository.getEventDataById(cancelId);
    assert(repoCancel.lifecycleStatus === undefined, 'cancel: repo event data does NOT expose lifecycleStatus');
    assert(repoCancel.status === STATUS.CANCELLED, 'cancel: repo returns legacy status');

    // Verify raw_data was NOT polluted by lifecycleStatus during cancel update
    const rawAfterCancel = await query(
      "SELECT raw_data->>'lifecycleStatus' AS raw_ls FROM events WHERE id = $1",
      [cancelId]
    );
    assert(rawAfterCancel.rows[0].raw_ls === null, 'cancel: raw_data does NOT contain lifecycleStatus');

    // ===================================================================
    // Section 5: Migration backfill simulation (parameterized)
    // ===================================================================
    console.log('--- Section 5: Migration backfill simulation (parameterized) ---');

    // pending -> submitted
    const bfPendingId = sid('bfp');
    await query(
      `INSERT INTO events (id, name, start_at, status, visibility, created_at, last_updated_at, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [bfPendingId, 'Backfill Pending', now + 86400000, STATUS.PENDING, VISIBILITY.PRIVATE, now, now,
       JSON.stringify({ name: 'Backfill Pending', date: now + 86400000, status: STATUS.PENDING, visibility: VISIBILITY.PRIVATE })]
    );
    const beforeBf = await query('SELECT lifecycle_status FROM events WHERE id = $1', [bfPendingId]);
    assert(beforeBf.rows[0].lifecycle_status === null, 'backfill: lifecycle_status is null before backfill');
    await query('UPDATE events SET lifecycle_status = $1 WHERE id = $2 AND lifecycle_status IS NULL',
      [LIFECYCLE.SUBMITTED, bfPendingId]);
    const afterBf = await query('SELECT lifecycle_status, status FROM events WHERE id = $1', [bfPendingId]);
    assert(afterBf.rows[0].lifecycle_status === LIFECYCLE.SUBMITTED, 'backfill: pending -> submitted');
    assert(afterBf.rows[0].status === STATUS.PENDING, 'backfill: legacy status preserved as pending');

    // active -> published
    const bfActiveId = sid('bfa');
    await query(
      `INSERT INTO events (id, name, start_at, status, visibility, created_at, last_updated_at, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [bfActiveId, 'Backfill Active', now + 86400000, STATUS.ACTIVE, VISIBILITY.PUBLIC, now, now,
       JSON.stringify({ name: 'Backfill Active', date: now + 86400000, status: STATUS.ACTIVE, visibility: VISIBILITY.PUBLIC })]
    );
    await query('UPDATE events SET lifecycle_status = $1 WHERE id = $2 AND lifecycle_status IS NULL',
      [LIFECYCLE.PUBLISHED, bfActiveId]);
    const afterBfActive = await query('SELECT lifecycle_status, status FROM events WHERE id = $1', [bfActiveId]);
    assert(afterBfActive.rows[0].lifecycle_status === LIFECYCLE.PUBLISHED, 'backfill: active -> published');

    // rejected -> rejected
    const bfRejectedId = sid('bfr');
    await query(
      `INSERT INTO events (id, name, start_at, status, visibility, created_at, last_updated_at, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [bfRejectedId, 'Backfill Rejected', now + 86400000, STATUS.REJECTED, VISIBILITY.PRIVATE, now, now,
       JSON.stringify({ name: 'Backfill Rejected', date: now + 86400000, status: STATUS.REJECTED, visibility: VISIBILITY.PRIVATE })]
    );
    await query('UPDATE events SET lifecycle_status = $1 WHERE id = $2 AND lifecycle_status IS NULL',
      [LIFECYCLE.REJECTED, bfRejectedId]);
    const afterBfRejected = await query('SELECT lifecycle_status, status FROM events WHERE id = $1', [bfRejectedId]);
    assert(afterBfRejected.rows[0].lifecycle_status === LIFECYCLE.REJECTED, 'backfill: rejected -> rejected');

    // cancelled -> cancelled
    const bfCancelledId = sid('bfc');
    await query(
      `INSERT INTO events (id, name, start_at, status, visibility, created_at, last_updated_at, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [bfCancelledId, 'Backfill Cancelled', now + 86400000, STATUS.CANCELLED, VISIBILITY.PRIVATE, now, now,
       JSON.stringify({ name: 'Backfill Cancelled', date: now + 86400000, status: STATUS.CANCELLED, visibility: VISIBILITY.PRIVATE })]
    );
    await query('UPDATE events SET lifecycle_status = $1 WHERE id = $2 AND lifecycle_status IS NULL',
      [LIFECYCLE.CANCELLED, bfCancelledId]);
    const afterBfCancelled = await query('SELECT lifecycle_status, status FROM events WHERE id = $1', [bfCancelledId]);
    assert(afterBfCancelled.rows[0].lifecycle_status === LIFECYCLE.CANCELLED, 'backfill: cancelled -> cancelled');

    // ===================================================================
    // Section 6: Old raw_data with lifecycleStatus stripped on read
    // ===================================================================
    console.log('--- Section 6: lifecycleStatus stripped from old raw_data on read ---');

    const oldRowId = sid('old');
    await query(
      `INSERT INTO events (id, name, start_at, status, visibility, lifecycle_status, created_at, last_updated_at, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [oldRowId, 'Old Format', now + 86400000, STATUS.ACTIVE, VISIBILITY.PUBLIC, LIFECYCLE.PUBLISHED, now, now,
       JSON.stringify({ name: 'Old Format', date: now + 86400000 })]
    );

    const repoOld = await eventRepository.getEventDataById(oldRowId);
    assert(repoOld.lifecycleStatus === undefined, 'old-row: lifecycleStatus NOT exposed in repo event data');
    assert(repoOld.name === 'Old Format', 'old-row: existing fields still present');

    const dbOld = await query('SELECT status, lifecycle_status FROM events WHERE id = $1', [oldRowId]);
    assert(dbOld.rows[0].lifecycle_status === LIFECYCLE.PUBLISHED, 'old-row: column lifecycle_status is published');
    assert(dbOld.rows[0].status === STATUS.ACTIVE, 'old-row: column status is active');

    // ===================================================================
    // Section 7: Event with lifecycleStatus in raw_data (pre-fix) gets stripped
    // ===================================================================
    console.log('--- Section 7: lifecycleStatus stripped from raw_data that contains it ---');

    const legacyRawId = sid('leg');
    await query(
      `INSERT INTO events (id, name, start_at, status, visibility, lifecycle_status, created_at, last_updated_at, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [legacyRawId, 'LegacyRaw', now + 86400000, STATUS.ACTIVE, VISIBILITY.PUBLIC, LIFECYCLE.PUBLISHED, now, now,
       JSON.stringify({ name: 'LegacyRaw', date: now + 86400000, status: STATUS.ACTIVE, visibility: VISIBILITY.PUBLIC, lifecycleStatus: LIFECYCLE.PUBLISHED })]
    );

    const repoLeg = await eventRepository.getEventDataById(legacyRawId);
    assert(repoLeg.lifecycleStatus === undefined, 'legacy-raw: lifecycleStatus stripped from raw_data on read');
    assert(repoLeg.status === STATUS.ACTIVE, 'legacy-raw: legacy status preserved');

    // ===================================================================
    // Results
    // ===================================================================
    console.log('');
    console.log('=== Results ===');
    console.log('  PASS: ' + PASS.length);
    console.log('  FAIL: ' + FAIL.length);

    if (FAIL.length > 0) {
      console.error('FAILURES:');
      for (const f of FAIL) {
        console.error('  - ' + f);
      }
      process.exit(1);
    } else {
      console.log('All lifecycle persistence tests passed.');
    }

  } finally {
    console.log('Cleaning up synthetic rows...');
    try {
      for (const id of syntheticIds) {
        await query('DELETE FROM events WHERE id = $1', [id]).catch(() => {});
      }
      console.log('Cleanup finished.');
    } catch (e) {
      console.error('Cleanup error:', e.message);
    }
    await getPool().end();
  }
}

run().catch(err => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
});
