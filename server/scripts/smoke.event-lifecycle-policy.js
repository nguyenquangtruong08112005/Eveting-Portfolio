require('dotenv').config();

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

require('./../src/alias-bootstrap');

const {
  LIFECYCLE, STATUS, VISIBILITY,
  isPublicDetailVisible, isPublicListingVisible, isSearchable,
  canonicalToLegacyStatus, canonicalToVisibility,
} = require('@/modules/events/domain/event-lifecycle');

function run() {
  console.log('--- Phase P1.2-S2 Event Lifecycle Policy Smoke Test ---');
  console.log('');

  // -------------------------------------------------------------------------
  // Section 1: Public detail visibility (maps to getEventById behavior)
  // -------------------------------------------------------------------------
  console.log('--- Section 1: Public detail visibility (getEventById) ---');

  // Cancelled events are never visible in detail
  assert(isPublicDetailVisible(STATUS.CANCELLED, VISIBILITY.PUBLIC) === false,
    'cancelled+public detail: not visible');
  assert(isPublicDetailVisible(STATUS.CANCELLED, VISIBILITY.PRIVATE) === false,
    'cancelled+private detail: not visible');

  // Active + public is visible in detail (the common case)
  assert(isPublicDetailVisible(STATUS.ACTIVE, VISIBILITY.PUBLIC) === true,
    'active+public detail: visible');

  // Pending + public is visible in detail (same as current getEventById)
  assert(isPublicDetailVisible(STATUS.PENDING, VISIBILITY.PUBLIC) === true,
    'pending+public detail: visible');

  // Rejected + public is visible in detail (same as current getEventById)
  assert(isPublicDetailVisible(STATUS.REJECTED, VISIBILITY.PUBLIC) === true,
    'rejected+public detail: visible');

  // Private is never visible in detail for non-owner
  assert(isPublicDetailVisible(STATUS.PENDING, VISIBILITY.PRIVATE) === false,
    'pending+private detail: not visible');
  assert(isPublicDetailVisible(STATUS.ACTIVE, VISIBILITY.PRIVATE) === false,
    'active+private detail: not visible');

  // Unlisted is not covered by isPublicDetailVisible (handled separately in service)
  assert(isPublicDetailVisible(STATUS.ACTIVE, VISIBILITY.UNLISTED) === false,
    'active+unlisted detail: not visible via public helper (needs auth)');

  // -------------------------------------------------------------------------
  // Section 2: Public listing/search visibility (maps to getPublicEventsPage,
  //            searchEvents, findNearbyEvents behavior)
  // -------------------------------------------------------------------------
  console.log('--- Section 2: Public listing / search visibility ---');

  // Only active + public is listing-visible
  assert(isPublicListingVisible(STATUS.ACTIVE, VISIBILITY.PUBLIC) === true,
    'active+public listing: visible');
  assert(isPublicListingVisible(STATUS.PENDING, VISIBILITY.PUBLIC) === false,
    'pending+public listing: not visible');
  assert(isPublicListingVisible(STATUS.REJECTED, VISIBILITY.PUBLIC) === false,
    'rejected+public listing: not visible');
  assert(isPublicListingVisible(STATUS.CANCELLED, VISIBILITY.PUBLIC) === false,
    'cancelled+public listing: not visible');
  assert(isPublicListingVisible(STATUS.ACTIVE, VISIBILITY.PRIVATE) === false,
    'active+private listing: not visible');
  assert(isPublicListingVisible(STATUS.ACTIVE, VISIBILITY.UNLISTED) === false,
    'active+unlisted listing: not visible');

  // isSearchable is an alias for isPublicListingVisible
  assert(isSearchable(STATUS.ACTIVE, VISIBILITY.PUBLIC) === true,
    'searchable active+public: true');

  // -------------------------------------------------------------------------
  // Section 3: Admin approve/reject legacy outputs
  // -------------------------------------------------------------------------
  console.log('--- Section 3: Admin approve / reject lifecycle outputs ---');

  // Approve: pending -> active + public
  assert(canonicalToLegacyStatus(LIFECYCLE.APPROVED) === STATUS.ACTIVE,
    'approve legacy status: active');
  assert(canonicalToLegacyStatus(LIFECYCLE.PUBLISHED) === STATUS.ACTIVE,
    'published legacy status: active');
  assert(canonicalToVisibility(LIFECYCLE.APPROVED) === VISIBILITY.PUBLIC,
    'approve visibility: public');
  assert(canonicalToVisibility(LIFECYCLE.PUBLISHED) === VISIBILITY.PUBLIC,
    'published visibility: public');

  // Reject: submitted -> rejected
  assert(canonicalToLegacyStatus(LIFECYCLE.REJECTED) === STATUS.REJECTED,
    'reject legacy status: rejected');
  assert(canonicalToVisibility(LIFECYCLE.REJECTED) === VISIBILITY.PRIVATE,
    'reject visibility: private');

  // Cancel: published -> cancelled
  assert(canonicalToLegacyStatus(LIFECYCLE.CANCELLED) === STATUS.CANCELLED,
    'cancel legacy status: cancelled');
  assert(canonicalToVisibility(LIFECYCLE.CANCELLED) === VISIBILITY.PRIVATE,
    'cancel visibility: private');

  // Create (draft): pending + private
  assert(canonicalToLegacyStatus(LIFECYCLE.DRAFT) === STATUS.PENDING,
    'create/draft legacy status: pending');
  assert(canonicalToVisibility(LIFECYCLE.DRAFT) === VISIBILITY.PRIVATE,
    'create/draft visibility: private');

  // -------------------------------------------------------------------------
  // Section 4: Unlisted + authenticated behavior (getEventById logic)
  // -------------------------------------------------------------------------
  console.log('--- Section 4: Unlisted + authenticated boundary ---');

  // Unlisted is NOT visible via the public detail helper (requires auth)
  assert(isPublicDetailVisible(STATUS.ACTIVE, VISIBILITY.UNLISTED) === false,
    'unlisted requires auth - public helper returns false');

  // But unlisted CAN be visible in listing? No — listing requires public
  assert(isPublicListingVisible(STATUS.ACTIVE, VISIBILITY.UNLISTED) === false,
    'unlisted not listing-visible');

  // Unlisted IS visible to the owner/admin via the bypass in getEventById
  // (tested by the isOwnerOrAdmin check, not by these helpers)

  // -------------------------------------------------------------------------
  // Section 5: Cancelled filter boundary
  // -------------------------------------------------------------------------
  console.log('--- Section 5: Cancelled filter boundary ---');

  // Cancelled blocks all visibility paths
  assert(isPublicDetailVisible(STATUS.CANCELLED, VISIBILITY.PUBLIC) === false,
    'cancelled blocks detail even if public');
  assert(isPublicListingVisible(STATUS.CANCELLED, VISIBILITY.PUBLIC) === false,
    'cancelled blocks listing even if public');
  assert(isSearchable(STATUS.CANCELLED, VISIBILITY.PUBLIC) === false,
    'cancelled not searchable');

  // -------------------------------------------------------------------------
  // Section 6: ES indexing boundary (documentation check)
  // -------------------------------------------------------------------------
  console.log('--- Section 6: ES indexing boundary (documented) ---');

  // The ES indexing condition in updateEvent uses:
  //   if (status !== ACTIVE || visibility === PRIVATE) -> DELETE
  // This means events indexed when: active AND (public OR unlisted)
  // isSearchable would only index active+public, excluding active+unlisted.
  // Therefore the ES check is intentionally NOT replaced with isSearchable.
  assert(isSearchable(STATUS.ACTIVE, VISIBILITY.UNLISTED) !== true ||
         isPublicListingVisible(STATUS.ACTIVE, VISIBILITY.UNLISTED) !== true,
    'ES indexes active+unlisted; isSearchable would exclude them (different)');

  // Active+unlisted is visible in detail only with auth
  assert(isPublicDetailVisible(STATUS.ACTIVE, VISIBILITY.UNLISTED) === false,
    'active+unlisted detail requires auth (separate from ES index decision)');

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
    console.log('All event lifecycle policy tests passed.');
  }
}

run();
