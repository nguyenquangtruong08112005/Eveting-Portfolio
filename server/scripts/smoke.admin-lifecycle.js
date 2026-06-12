require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.DATABASE_PROVIDER = 'postgres';
process.env.EVENT_DATABASE_PROVIDER = 'postgres';
process.env.ADMIN_DATABASE_PROVIDER = 'postgres';
process.env.FEATURED_PROFILE_DATABASE_PROVIDER = 'postgres';

require('./../src/alias-bootstrap');

const { query, getPool } = require('@/providers/database/postgres.client');
const eventRepository = require('@/providers/database/event.repository');
const adminRepository = require('@/providers/database/admin.repository');
const adminService = require('@/modules/admin/application/service');
const eventService = require('@/modules/events/application/service');
const { STATUS, VISIBILITY, LIFECYCLE } = require('@/modules/events/domain/event-lifecycle');
const { v4: uuidv4 } = require('uuid');

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

const syntheticIds = [];
let dbRoundTrips = 0;

async function run() {
  const now = Date.now();
  console.log('--- Phase P1.2-S6 Admin Lifecycle Boundary Smoke Test ---');
  console.log('');

  // ===================================================================
  // Setup: helper to check if an event id is in the pending queue
  // ===================================================================
  async function pendingIncludes(id) {
    const pending = await adminRepository.getPendingEvents(1, 100);
    dbRoundTrips++;
    return pending.some(e => e.id === id);
  }

  // ===================================================================
  // Section 1: Draft create excluded from admin pending queue
  // ===================================================================
  console.log('--- Section 1: Draft excluded from pending queue ---');

  const draftEvt = await eventService.createEvent({
    name: 'S6 Draft Excluded',
    date: now + 86400000,
    eventType: 'online',
    onlineUrl: 'https://example.com/s6-draft-excluded',
    ticketTypes: {},
    saveAsDraft: true,
  }, 'smoke_s6_org');
  const draftId = draftEvt.id;
  syntheticIds.push(draftId);
  dbRoundTrips += 2;

  assert(draftEvt.status === STATUS.PENDING, 'draft: legacy status is pending');
  assert(draftEvt.lifecycleStatus === undefined, 'draft: lifecycleStatus NOT exposed');

  const inPendingBefore = await pendingIncludes(draftId);
  assert(inPendingBefore === false, 'draft: excluded from pending queue');

  // ===================================================================
  // Section 2: Submitted create (no saveAsDraft) IS in pending queue
  // ===================================================================
  console.log('');
  console.log('--- Section 2: Submitted event included in pending queue ---');

  const submittedEvt = await eventService.createEvent({
    name: 'S6 Submitted Included',
    date: now + 86400000,
    eventType: 'online',
    onlineUrl: 'https://example.com/s6-submitted-included',
    ticketTypes: {},
  }, 'smoke_s6_org');
  const submittedId = submittedEvt.id;
  syntheticIds.push(submittedId);
  dbRoundTrips += 2;

  assert(submittedEvt.status === STATUS.PENDING, 'submitted: legacy status is pending');
  assert(submittedEvt.lifecycleStatus === undefined, 'submitted: lifecycleStatus NOT exposed');

  const inPendingAfterCreate = await pendingIncludes(submittedId);
  assert(inPendingAfterCreate === true, 'submitted: included in pending queue');

  // ===================================================================
  // Section 3: Submitted draft appears after submit-draft
  // ===================================================================
  console.log('');
  console.log('--- Section 3: Submitted draft appears after submit-draft ---');

  const draftToSubmit = await eventService.createEvent({
    name: 'S6 Draft Then Submit',
    date: now + 86400000,
    eventType: 'online',
    onlineUrl: 'https://example.com/s6-draft-then-submit',
    ticketTypes: {},
    saveAsDraft: true,
  }, 'smoke_s6_org');
  const submitAfterId = draftToSubmit.id;
  syntheticIds.push(submitAfterId);
  dbRoundTrips += 2;

  const beforeSubmit = await pendingIncludes(submitAfterId);
  assert(beforeSubmit === false, 'draft-then-submit: excluded before submit');

  await eventService.submitDraft(submitAfterId, 'smoke_s6_org');
  dbRoundTrips += 3;

  const afterSubmit = await pendingIncludes(submitAfterId);
  assert(afterSubmit === true, 'draft-then-submit: included after submit');

  // ===================================================================
  // Section 4: Approve submitted event succeeds
  // ===================================================================
  console.log('');
  console.log('--- Section 4: Approve submitted event succeeds ---');

  const resultApprove = await adminService.approveEvent(submittedId);
  dbRoundTrips += 3;
  assert(resultApprove.success === true, 'approve-submitted: returns success');

  const dbApproved = await query(
    'SELECT status, visibility, lifecycle_status FROM events WHERE id = $1',
    [submittedId]
  );
  dbRoundTrips++;
  assert(dbApproved.rows[0].status === STATUS.ACTIVE, 'approve-submitted: status is active');
  assert(dbApproved.rows[0].visibility === VISIBILITY.PUBLIC, 'approve-submitted: visibility is public');
  assert(dbApproved.rows[0].lifecycle_status === LIFECYCLE.PUBLISHED, 'approve-submitted: lifecycle_status is published');

  // ===================================================================
  // Section 5: Approve explicit draft fails with 400
  // ===================================================================
  console.log('');
  console.log('--- Section 5: Approve explicit draft fails ---');

  let approveDraftErr = null;
  try {
    await adminService.approveEvent(draftId);
    dbRoundTrips += 2;
  } catch (err) {
    approveDraftErr = err;
    // getEventLifecycleOwnership succeeds, then BadRequestError thrown
    dbRoundTrips += 1;
  }
  assert(approveDraftErr !== null, 'approve-draft: throws error');
  assert(approveDraftErr.statusCode === 400 || approveDraftErr.name === 'BadRequestError',
    'approve-draft: error is BadRequestError with status 400');
  assert(approveDraftErr.message.toLowerCase().includes('cannot approve'),
    'approve-draft: error message mentions cannot approve');

  // Verify draft lifecycle unchanged
  const dbDraftAfter = await query(
    'SELECT lifecycle_status, status FROM events WHERE id = $1',
    [draftId]
  );
  dbRoundTrips++;
  assert(dbDraftAfter.rows[0].lifecycle_status === LIFECYCLE.DRAFT, 'approve-draft: lifecycle_status still draft');

  // ===================================================================
  // Section 6: Reject submitted event succeeds
  // ===================================================================
  console.log('');
  console.log('--- Section 6: Reject submitted event succeeds ---');

  const rejectableEvt = await eventService.createEvent({
    name: 'S6 Rejectable',
    date: now + 86400000,
    eventType: 'online',
    onlineUrl: 'https://example.com/s6-rejectable',
    ticketTypes: {},
  }, 'smoke_s6_org');
  const rejectableId = rejectableEvt.id;
  syntheticIds.push(rejectableId);
  dbRoundTrips += 2;

  const resultReject = await adminService.rejectEvent(rejectableId, 'Test reject reason');
  dbRoundTrips += 2;
  assert(resultReject.success === true, 'reject-submitted: returns success');

  const dbRejected = await query(
    'SELECT status, lifecycle_status FROM events WHERE id = $1',
    [rejectableId]
  );
  dbRoundTrips++;
  assert(dbRejected.rows[0].status === STATUS.REJECTED, 'reject-submitted: status is rejected');
  assert(dbRejected.rows[0].lifecycle_status === LIFECYCLE.REJECTED, 'reject-submitted: lifecycle_status is rejected');

  // ===================================================================
  // Section 7: Reject explicit draft fails with 400
  // ===================================================================
  console.log('');
  console.log('--- Section 7: Reject explicit draft fails ---');

  const draftToReject = await eventService.createEvent({
    name: 'S6 Draft Reject Attempt',
    date: now + 86400000,
    eventType: 'online',
    onlineUrl: 'https://example.com/s6-draft-reject',
    ticketTypes: {},
    saveAsDraft: true,
  }, 'smoke_s6_org');
  const draftRejectId = draftToReject.id;
  syntheticIds.push(draftRejectId);
  dbRoundTrips += 2;

  let rejectDraftErr = null;
  try {
    await adminService.rejectEvent(draftRejectId, 'Should fail');
    dbRoundTrips += 2;
  } catch (err) {
    rejectDraftErr = err;
    dbRoundTrips += 1;
  }
  assert(rejectDraftErr !== null, 'reject-draft: throws error');
  assert(rejectDraftErr.statusCode === 400 || rejectDraftErr.name === 'BadRequestError',
    'reject-draft: error is BadRequestError with status 400');
  assert(rejectDraftErr.message.toLowerCase().includes('cannot reject'),
    'reject-draft: error message mentions cannot reject');

  // ===================================================================
  // Section 8: Legacy null lifecycle pending row included in pending queue
  // ===================================================================
  console.log('');
  console.log('--- Section 8: Legacy null lifecycle row in pending queue ---');

  const legacyId = 'smoke_s6_legacy_' + Date.now();
  syntheticIds.push(legacyId);
  await eventRepository.createEvent(legacyId, {
    name: 'S6 Legacy Pending',
    description: 'No lifecycle_status set (legacy)',
    status: 'pending',
    visibility: 'private',
    featuredProfileIds: [],
    date: now,
    createdAt: now,
    lastUpdatedAt: now,
  });
  dbRoundTrips++;

  // Verify lifecycle_status is NULL
  const dbLegacy = await query(
    'SELECT lifecycle_status FROM events WHERE id = $1',
    [legacyId]
  );
  dbRoundTrips++;
  assert(dbLegacy.rows[0].lifecycle_status === null, 'legacy: lifecycle_status is NULL');

  const legacyInPending = await pendingIncludes(legacyId);
  assert(legacyInPending === true, 'legacy: included in pending queue');

  // ===================================================================
  // Section 9: Legacy null lifecycle row is approveable
  // ===================================================================
  console.log('');
  console.log('--- Section 9: Legacy null lifecycle row approveable ---');

  const legacyApproveResult = await adminService.approveEvent(legacyId);
  dbRoundTrips += 3;
  assert(legacyApproveResult.success === true, 'legacy-approve: returns success');

  const dbLegacyApproved = await query(
    'SELECT status, lifecycle_status FROM events WHERE id = $1',
    [legacyId]
  );
  dbRoundTrips++;
  assert(dbLegacyApproved.rows[0].status === STATUS.ACTIVE, 'legacy-approve: status is active');
  assert(dbLegacyApproved.rows[0].lifecycle_status === LIFECYCLE.PUBLISHED, 'legacy-approve: lifecycle_status is published');

  // ===================================================================
  // Section 10: Legacy row rejectable (create new legacy for this)
  // ===================================================================
  console.log('');
  console.log('--- Section 10: Legacy null lifecycle row rejectable ---');

  const legacyRejectId = 'smoke_s6_legacy_rej_' + Date.now();
  syntheticIds.push(legacyRejectId);
  await eventRepository.createEvent(legacyRejectId, {
    name: 'S6 Legacy Reject',
    description: 'Legacy row for reject test',
    status: 'pending',
    visibility: 'private',
    featuredProfileIds: [],
    date: now,
    createdAt: now,
    lastUpdatedAt: now,
  });
  dbRoundTrips++;

  const legacyRejectResult = await adminService.rejectEvent(legacyRejectId, 'Legacy reject test');
  dbRoundTrips += 2;
  assert(legacyRejectResult.success === true, 'legacy-reject: returns success');

  const dbLegacyRejected = await query(
    'SELECT status, lifecycle_status FROM events WHERE id = $1',
    [legacyRejectId]
  );
  dbRoundTrips++;
  assert(dbLegacyRejected.rows[0].status === STATUS.REJECTED, 'legacy-reject: status is rejected');
  assert(dbLegacyRejected.rows[0].lifecycle_status === LIFECYCLE.REJECTED, 'legacy-reject: lifecycle_status is rejected');

  // ===================================================================
  // Section 11: Legacy null lifecycle + non-pending status NOT approveable/rejectable
  // ===================================================================
  console.log('');
  console.log('--- Section 11: Legacy null lifecycle active row not approveable/rejectable ---');

  const legacyActiveId = 'smoke_s6_active_legacy_' + Date.now();
  syntheticIds.push(legacyActiveId);
  await eventRepository.createEvent(legacyActiveId, {
    name: 'S6 Legacy Active',
    description: 'No lifecycle_status, status=active (already approved legacy)',
    status: 'active',
    visibility: 'public',
    featuredProfileIds: [],
    date: now,
    createdAt: now,
    lastUpdatedAt: now,
  });
  dbRoundTrips++;

  const dbLegacyActive = await query(
    'SELECT lifecycle_status, status FROM events WHERE id = $1',
    [legacyActiveId]
  );
  dbRoundTrips++;
  assert(dbLegacyActive.rows[0].lifecycle_status === null, 'legacy-active: lifecycle_status is NULL');
  assert(dbLegacyActive.rows[0].status === STATUS.ACTIVE, 'legacy-active: legacy status is active');

  let approveActiveLegacyErr = null;
  try {
    await adminService.approveEvent(legacyActiveId);
    dbRoundTrips += 2;
  } catch (err) {
    approveActiveLegacyErr = err;
    dbRoundTrips += 1;
  }
  assert(approveActiveLegacyErr !== null, 'legacy-active-approve: throws error');
  assert(approveActiveLegacyErr.statusCode === 400 || approveActiveLegacyErr.name === 'BadRequestError',
    'legacy-active-approve: error is BadRequestError');
  assert(approveActiveLegacyErr.message.includes('legacy active'),
    'legacy-active-approve: error message mentions legacy active');

  let rejectActiveLegacyErr = null;
  try {
    await adminService.rejectEvent(legacyActiveId, 'Should fail');
    dbRoundTrips += 2;
  } catch (err) {
    rejectActiveLegacyErr = err;
    dbRoundTrips += 1;
  }
  assert(rejectActiveLegacyErr !== null, 'legacy-active-reject: throws error');
  assert(rejectActiveLegacyErr.statusCode === 400 || rejectActiveLegacyErr.name === 'BadRequestError',
    'legacy-active-reject: error is BadRequestError');
  assert(rejectActiveLegacyErr.message.includes('legacy active'),
    'legacy-active-reject: error message mentions legacy active');

  // ===================================================================
  // Results
  // ===================================================================
  console.log('');
  console.log('=== Results ===');
  console.log('  PASS: ' + PASS.length);
  console.log('  FAIL: ' + FAIL.length);
  console.log('  Estimated DB round trips: ' + dbRoundTrips);

  if (FAIL.length > 0) {
    console.error('FAILURES:');
    for (const f of FAIL) {
      console.error('  - ' + f);
    }
    process.exit(1);
  } else {
    console.log('All admin lifecycle boundary tests passed.');
  }
}

run().catch(err => {
  console.error('Smoke test failed:', err.message);
  process.exit(1);
}).finally(async () => {
  console.log('Cleaning up synthetic rows...');
  try {
    for (const id of syntheticIds) {
      await query('DELETE FROM events WHERE id = $1', [id]).catch(() => {});
    }
    console.log('Cleanup finished.');
  } catch (e) {
    console.error('Cleanup error:', e.message);
  }
  try { await getPool().end(); } catch { /* ignore */ }
});
