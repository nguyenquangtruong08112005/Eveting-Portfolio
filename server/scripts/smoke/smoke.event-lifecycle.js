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

require('../../src/alias-bootstrap');

const el = require('@/modules/events/domain/event-lifecycle');

function run() {
  console.log('--- Phase P1.2-S1 Event Lifecycle Smoke Test ---');
  console.log('');

  console.log('--- Test 1: Constant values ---');
  assert(el.LIFECYCLE.DRAFT === 'draft', 'LIFECYCLE.DRAFT === draft');
  assert(el.LIFECYCLE.SUBMITTED === 'submitted', 'LIFECYCLE.SUBMITTED === submitted');
  assert(el.LIFECYCLE.APPROVED === 'approved', 'LIFECYCLE.APPROVED === approved');
  assert(el.LIFECYCLE.PUBLISHED === 'published', 'LIFECYCLE.PUBLISHED === published');
  assert(el.LIFECYCLE.REJECTED === 'rejected', 'LIFECYCLE.REJECTED === rejected');
  assert(el.LIFECYCLE.CANCELLED === 'cancelled', 'LIFECYCLE.CANCELLED === cancelled');
  assert(el.STATUS.PENDING === 'pending', 'STATUS.PENDING === pending');
  assert(el.STATUS.ACTIVE === 'active', 'STATUS.ACTIVE === active');
  assert(el.STATUS.REJECTED === 'rejected', 'STATUS.REJECTED === rejected');
  assert(el.STATUS.CANCELLED === 'cancelled', 'STATUS.CANCELLED === cancelled');
  assert(el.VISIBILITY.PUBLIC === 'public', 'VISIBILITY.PUBLIC === public');
  assert(el.VISIBILITY.PRIVATE === 'private', 'VISIBILITY.PRIVATE === private');
  assert(el.VISIBILITY.UNLISTED === 'unlisted', 'VISIBILITY.UNLISTED === unlisted');

  console.log('--- Test 2: Canonical to legacy mapping ---');
  assert(el.canonicalToLegacyStatus('draft') === 'pending', 'draft -> pending');
  assert(el.canonicalToLegacyStatus('submitted') === 'pending', 'submitted -> pending');
  assert(el.canonicalToLegacyStatus('approved') === 'active', 'approved -> active');
  assert(el.canonicalToLegacyStatus('published') === 'active', 'published -> active');
  assert(el.canonicalToLegacyStatus('rejected') === 'rejected', 'rejected -> rejected');
  assert(el.canonicalToLegacyStatus('cancelled') === 'cancelled', 'cancelled -> cancelled');
  assert(el.canonicalToLegacyStatus('unknown') === 'pending', 'unknown -> pending (fallback)');

  console.log('--- Test 3: Legacy to canonical mapping ---');
  assert(el.legacyToCanonicalStatus('pending') === 'draft', 'pending -> draft');
  assert(el.legacyToCanonicalStatus('active') === 'published', 'active -> published');
  assert(el.legacyToCanonicalStatus('rejected') === 'rejected', 'rejected -> rejected');
  assert(el.legacyToCanonicalStatus('cancelled') === 'cancelled', 'cancelled -> cancelled');
  assert(el.legacyToCanonicalStatus('unknown') === 'draft', 'unknown -> draft (fallback)');

  console.log('--- Test 4: Canonical to visibility mapping ---');
  assert(el.canonicalToVisibility('draft') === 'private', 'draft -> private');
  assert(el.canonicalToVisibility('submitted') === 'private', 'submitted -> private');
  assert(el.canonicalToVisibility('approved') === 'public', 'approved -> public');
  assert(el.canonicalToVisibility('published') === 'public', 'published -> public');
  assert(el.canonicalToVisibility('rejected') === 'private', 'rejected -> private');
  assert(el.canonicalToVisibility('cancelled') === 'private', 'cancelled -> private');

  console.log('--- Test 5: Transition rules ---');
  assert(el.isTransitionAllowed('draft', 'submitted') === true, 'draft -> submitted allowed');
  assert(el.isTransitionAllowed('draft', 'approved') === false, 'draft -> approved not allowed');
  assert(el.isTransitionAllowed('submitted', 'approved') === true, 'submitted -> approved allowed');
  assert(el.isTransitionAllowed('submitted', 'rejected') === true, 'submitted -> rejected allowed');
  assert(el.isTransitionAllowed('approved', 'published') === true, 'approved -> published allowed');
  assert(el.isTransitionAllowed('approved', 'cancelled') === false, 'approved -> cancelled not allowed');
  assert(el.isTransitionAllowed('published', 'cancelled') === true, 'published -> cancelled allowed');
  assert(el.isTransitionAllowed('rejected', 'draft') === false, 'rejected -> draft not allowed');
  assert(el.isTransitionAllowed('cancelled', 'draft') === false, 'cancelled -> draft not allowed');
  assert(el.isTransitionAllowed('unknown', 'draft') === false, 'unknown -> draft not allowed');

  console.log('--- Test 6: Public detail visibility predicate ---');
  assert(el.isPublicDetailVisible('active', 'public') === true, 'active+public -> detail visible');
  assert(el.isPublicDetailVisible('active', 'private') === false, 'active+private -> detail not visible');
  assert(el.isPublicDetailVisible('pending', 'public') === true, 'pending+public -> detail visible');
  assert(el.isPublicDetailVisible('cancelled', 'public') === false, 'cancelled+public -> detail not visible');

  console.log('--- Test 7: Public listing visibility / searchable predicates ---');
  assert(el.isPublicListingVisible('active', 'public') === true, 'active+public -> listing visible');
  assert(el.isPublicListingVisible('active', 'private') === false, 'active+private -> listing not visible');
  assert(el.isPublicListingVisible('pending', 'public') === false, 'pending+public -> listing not visible');
  assert(el.isPublicListingVisible('cancelled', 'public') === false, 'cancelled+public -> listing not visible');
  assert(el.isSearchable('active', 'public') === true, 'searchable is alias for listing visible');
  assert(el.isSearchable('active', 'private') === false, 'active+private -> not searchable');
  assert(el.isSearchable('pending', 'public') === false, 'pending+public -> not searchable');
  assert(el.isSearchable('cancelled', 'public') === false, 'cancelled+public -> not searchable');

  console.log('--- Test 8: Validator helpers ---');
  assert(el.isValidCanonicalStatus('draft') === true, 'draft is valid canonical');
  assert(el.isValidCanonicalStatus('pending') === false, 'pending is not valid canonical');
  assert(el.isValidLegacyStatus('pending') === true, 'pending is valid legacy');
  assert(el.isValidLegacyStatus('draft') === false, 'draft is not valid legacy');
  assert(el.isValidVisibility('public') === true, 'public is valid visibility');
  assert(el.isValidVisibility('secret') === false, 'secret is not valid visibility');

  console.log('--- Test 9: Immutability (Object.freeze) ---');
  (function() {
    const origPublished = el.LIFECYCLE.PUBLISHED;
    try { el.LIFECYCLE.PUBLISHED = 'mutated'; } catch (e) { }
    assert(el.LIFECYCLE.PUBLISHED === origPublished, 'LIFECYCLE is frozen');
    const origLen = el.VALID_CANONICAL_STATUSES.length;
    try { el.VALID_CANONICAL_STATUSES.push('mutated'); } catch (e) { }
    assert(el.VALID_CANONICAL_STATUSES.length === origLen, 'VALID_CANONICAL_STATUSES is frozen');
  })();

  console.log('--- Test 10: Constant correctness (=== equality with literal strings in legacy code) ---');
  assert(el.STATUS.PENDING === 'pending', 'STATUS.PENDING matches literal "pending"');
  assert(el.STATUS.ACTIVE === 'active', 'STATUS.ACTIVE matches literal "active"');
  assert(el.STATUS.REJECTED === 'rejected', 'STATUS.REJECTED matches literal "rejected"');
  assert(el.STATUS.CANCELLED === 'cancelled', 'STATUS.CANCELLED matches literal "cancelled"');
  assert(el.VISIBILITY.PUBLIC === 'public', 'VISIBILITY.PUBLIC matches literal "public"');
  assert(el.VISIBILITY.PRIVATE === 'private', 'VISIBILITY.PRIVATE matches literal "private"');
  assert(el.VISIBILITY.UNLISTED === 'unlisted', 'VISIBILITY.UNLISTED matches literal "unlisted"');

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
    console.log('All event lifecycle smoke tests passed.');
  }
}

run();
