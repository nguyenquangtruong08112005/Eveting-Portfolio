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

const { v4: uuidv4 } = require('uuid');
const { query, getPool } = require('@/providers/database/postgres.client');
const eventRepository = require('@/providers/database/event.repository');
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

  try {
    console.log('--- Phase P1.2-S4 Draft Event Smoke Test ---');
    console.log('');

    // ===================================================================
    // Section 1: Default create (no flag) = lifecycle_status = submitted
    // ===================================================================
    console.log('--- Section 1: Default create (no saveAsDraft flag) ---');

    const defaultEvent = await eventService.createEvent({
      name: 'Default Create Test',
      description: 'Should be submitted, not draft',
      date: now + 86400000,
      eventType: 'online',
      onlineUrl: 'https://example.com/default',
      ticketTypes: { general: { name: 'General', price: 50, available: 100 } },
    }, 'smoke_org_default');
    const defaultId = defaultEvent.id;
    syntheticIds.push(defaultId);

    assert(defaultEvent.status === STATUS.PENDING, 'default: legacy status is pending');
    assert(defaultEvent.visibility === VISIBILITY.PRIVATE, 'default: legacy visibility is private');
    assert(defaultEvent.lifecycleStatus === undefined, 'default: lifecycleStatus NOT exposed in returned data');
    assert(defaultEvent.saveAsDraft === undefined, 'default: saveAsDraft NOT exposed in returned data');

    const dbDefault = await query(
      'SELECT lifecycle_status, status, visibility FROM events WHERE id = $1',
      [defaultId]
    );
    assert(dbDefault.rows[0].lifecycle_status === LIFECYCLE.SUBMITTED, 'default: lifecycle_status column is submitted');
    assert(dbDefault.rows[0].status === STATUS.PENDING, 'default: status column is pending');
    assert(dbDefault.rows[0].visibility === VISIBILITY.PRIVATE, 'default: visibility column is private');

    const repoDefault = await eventRepository.getEventDataById(defaultId);
    assert(repoDefault.lifecycleStatus === undefined, 'default: repo data does NOT expose lifecycleStatus');
    assert(repoDefault.status === STATUS.PENDING, 'default: repo returns legacy status');

    // ===================================================================
    // Section 2: Draft create (saveAsDraft=true) = lifecycle_status = draft
    // ===================================================================
    console.log('--- Section 2: Draft create (saveAsDraft: true) ---');

    const draftEvent = await eventService.createEvent({
      name: 'Draft Create Test',
      description: 'Should be draft lifecycle status',
      date: now + 86400000,
      eventType: 'online',
      onlineUrl: 'https://example.com/draft',
      ticketTypes: { general: { name: 'General', price: 50, available: 100 } },
      saveAsDraft: true,
    }, 'smoke_org_draft');
    const draftId = draftEvent.id;
    syntheticIds.push(draftId);

    // Returned data must still show legacy status/visibility (pending/private)
    assert(draftEvent.status === STATUS.PENDING, 'draft: legacy status is pending');
    assert(draftEvent.visibility === VISIBILITY.PRIVATE, 'draft: legacy visibility is private');
    assert(draftEvent.lifecycleStatus === undefined, 'draft: lifecycleStatus NOT exposed in returned data');

    // DB column must show draft
    const dbDraft = await query(
      'SELECT lifecycle_status, status, visibility FROM events WHERE id = $1',
      [draftId]
    );
    assert(dbDraft.rows[0].lifecycle_status === LIFECYCLE.DRAFT, 'draft: lifecycle_status column is draft');
    assert(dbDraft.rows[0].status === STATUS.PENDING, 'draft: status column is pending');
    assert(dbDraft.rows[0].visibility === VISIBILITY.PRIVATE, 'draft: visibility column is private');

    const repoDraft = await eventRepository.getEventDataById(draftId);
    assert(repoDraft.lifecycleStatus === undefined, 'draft: repo data does NOT expose lifecycleStatus');
    assert(repoDraft.status === STATUS.PENDING, 'draft: repo returns legacy status');

    // ===================================================================
    // Section 3: Draft vs submitted differ in column only
    // ===================================================================
    console.log('--- Section 3: Submitted vs draft column-only difference ---');

    assert(dbDefault.rows[0].lifecycle_status !== dbDraft.rows[0].lifecycle_status,
      'diff: lifecycle_status column differs (submitted vs draft)');
    assert(dbDefault.rows[0].status === dbDraft.rows[0].status,
      'diff: legacy status identical (both pending)');
    assert(dbDefault.rows[0].visibility === dbDraft.rows[0].visibility,
      'diff: legacy visibility identical (both private)');

    // ===================================================================
    // Section 4: Draft events invisible in public listing
    // ===================================================================
    console.log('--- Section 4: Draft events invisible in public listing ---');

    const listing = await eventRepository.getPublicEventsPage(1, 50);
    const draftInListing = listing.entries.some(e => e.id === draftId);
    assert(draftInListing === false, 'listing: draft event not in public listing');

    const defaultInListing = listing.entries.some(e => e.id === defaultId);
    assert(defaultInListing === false, 'listing: default (pending/private) also not in public listing');

    // ===================================================================
    // Section 5: saveAsDraft=false explicitly still yields submitted
    // ===================================================================
    console.log('--- Section 5: Explicit saveAsDraft: false ---');

    const explicitSubmitted = await eventService.createEvent({
      name: 'Explicit Not Draft',
      date: now + 86400000,
      eventType: 'online',
      onlineUrl: 'https://example.com/explicit',
      ticketTypes: {},
      saveAsDraft: false,
    }, 'smoke_org_explicit');
    const explicitId = explicitSubmitted.id;
    syntheticIds.push(explicitId);

    assert(explicitSubmitted.status === STATUS.PENDING, 'explicit-false: legacy status is pending');
    assert(explicitSubmitted.visibility === VISIBILITY.PRIVATE, 'explicit-false: legacy visibility is private');
    assert(explicitSubmitted.lifecycleStatus === undefined, 'explicit-false: lifecycleStatus NOT exposed');

    const dbExplicit = await query(
      'SELECT lifecycle_status FROM events WHERE id = $1',
      [explicitId]
    );
    assert(dbExplicit.rows[0].lifecycle_status === LIFECYCLE.SUBMITTED,
      'explicit-false: lifecycle_status column is submitted');

    // ===================================================================
    // Section 6: raw_data never contains lifecycleStatus for draft events
    // ===================================================================
    console.log('--- Section 6: raw_data never polluted by lifecycleStatus ---');

    const rawAfterDraft = await query(
      "SELECT raw_data->>'lifecycleStatus' AS raw_ls FROM events WHERE id = $1",
      [draftId]
    );
    assert(rawAfterDraft.rows[0].raw_ls === null, 'raw-data: draft event raw_data has no lifecycleStatus');

    const rawAfterDefault = await query(
      "SELECT raw_data->>'lifecycleStatus' AS raw_ls FROM events WHERE id = $1",
      [defaultId]
    );
    assert(rawAfterDefault.rows[0].raw_ls === null, 'raw-data: default event raw_data has no lifecycleStatus');

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
      console.log('All draft event tests passed.');
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
