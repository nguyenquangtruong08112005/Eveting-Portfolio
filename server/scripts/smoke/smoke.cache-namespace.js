require('dotenv').config({ quiet: true });

var TEST_KEYS;

async function smoke() {
  require('../../src/alias-bootstrap');
  var cacheNamespace = require('../../src/shared/cache/namespace-helpers');
  var cacheProvider = require('../../src/shared/cache/cache-provider');

  if (process.env.CACHE_SMOKE_EXPECT_FALLBACK === 'true') {
    await new Promise(function(r) { return setTimeout(r, 1500); });
    if (cacheProvider.isRedisAvailable()) {
      throw new Error('Expected Redis fallback but isRedisAvailable() returned true');
    }
    console.log('Fallback assertion OK (isRedisAvailable=false as expected)');
  }

  console.log('Starting Cache Namespace Smoke Test...');

  var P = cacheNamespace.PREFIX;
  var E1 = 'evt_smoke_1';
  var E2 = 'evt_smoke_2';
  var E3 = 'evt_smoke_gzip';
  var V1 = 'venue_smoke_1';

  TEST_KEYS = [
    P.EVENT + ':' + E1,
    P.EVENT + ':' + E2,
    P.EVENT + ':' + E3,
    P.VENUE + ':' + V1,
    P.SEAT_AVAILABILITY + ':' + E1,
  ];

  async function cleanup() {
    for (var k = 0; k < TEST_KEYS.length; k++) {
      try { await cacheNamespace.del(TEST_KEYS[k]); } catch (_) {}
    }
    try { await cacheProvider.disconnect(); } catch (_) {}
    console.log('Cleanup complete');
  }

  try {
    // 1. Test event cache
    console.log('Testing event cache...');
    var testEvent = { id: E1, name: 'Smoke Test Event', date: Date.now() };
    await cacheNamespace.setEvent(E1, testEvent);
    var retrieved = await cacheNamespace.getEvent(E1);
    if (!retrieved || retrieved.name !== 'Smoke Test Event') {
      throw new Error('Event cache get/set failed');
    }
    console.log('Event cache get/set OK');

    // 2. Test categories cache
    console.log('Testing categories cache...');
    var categories = ['music', 'sports', 'arts'];
    await cacheNamespace.setCategories(categories);
    var retrievedCats = await cacheNamespace.getCategories();
    if (!retrievedCats || retrievedCats.length !== 3) {
      throw new Error('Categories cache get/set failed');
    }
    console.log('Categories cache get/set OK');

    // 3. Test venue cache
    console.log('Testing venue cache...');
    var testVenue = { id: V1, name: 'Smoke Test Venue', city: 'HCMC' };
    await cacheNamespace.setVenue(V1, testVenue);
    var retrievedVenue = await cacheNamespace.getVenue(V1);
    if (!retrievedVenue || retrievedVenue.name !== 'Smoke Test Venue') {
      throw new Error('Venue cache get/set failed');
    }
    console.log('Venue cache get/set OK');

    // 4. Test seat availability cache
    console.log('Testing seat availability cache...');
    var seats = { A1: 'available', A2: 'held', A3: 'sold' };
    await cacheNamespace.setSeatAvailability(E1, seats);
    var retrievedSeats = await cacheNamespace.getSeatAvailability(E1);
    if (!retrievedSeats || retrievedSeats.A1 !== 'available') {
      throw new Error('Seat availability cache get/set failed');
    }
    console.log('Seat availability cache get/set OK');

    // 5. Test gzip large payload compression and transparent decompression
    console.log('Testing gzip large payload...');
    var bigStr = '';
    for (var i = 0; i < 3000; i++) { bigStr += 'The quick brown fox jumps over the lazy dog. '; }
    var largePayload = { id: E3, name: 'Gzip Test Event', description: bigStr, tags: ['a','b','c','d','e'] };
    await cacheNamespace.setEvent(E3, largePayload);
    var retrievedLarge = await cacheNamespace.getEvent(E3);
    if (!retrievedLarge || retrievedLarge.name !== 'Gzip Test Event') {
      throw new Error('Gzip large payload get/set failed');
    }
    if (retrievedLarge.description !== bigStr) {
      throw new Error('Gzip large payload content mismatch');
    }

    // Verify raw value is gzip64-encoded (self-describing format)
    var rawLarge = await cacheProvider.get(P.EVENT + ':' + E3);
    if (typeof rawLarge !== 'string' || !rawLarge.startsWith('gzip64:')) {
      throw new Error('Large payload not stored with gzip64: prefix (got: ' + (typeof rawLarge) + ')');
    }

    // Verify small payload is NOT gzip64-encoded
    var rawSmall = await cacheProvider.get(P.EVENT + ':' + E1);
    if (typeof rawSmall === 'string' && rawSmall.startsWith('gzip64:')) {
      throw new Error('Small payload should not be gzip64-encoded');
    }

    console.log('Gzip large payload OK');

    // 6. Test TTL constants
    console.log('Verifying TTL values...');
    if (cacheNamespace.TTL.EVENT !== 300) throw new Error('TTL.EVENT should be 300');
    if (cacheNamespace.TTL.CATEGORIES !== 3600) throw new Error('TTL.CATEGORIES should be 3600');
    if (cacheNamespace.TTL.VENUES !== 3600) throw new Error('TTL.VENUES should be 3600');
    if (cacheNamespace.TTL.SEAT_AVAILABILITY !== 10) throw new Error('TTL.SEAT_AVAILABILITY should be 10');
    console.log('TTL values OK');

    // 7. Test invalidation
    console.log('Testing invalidation...');
    await cacheNamespace.invalidateEvent(E1);
    var afterInvalidate = await cacheNamespace.getEvent(E1);
    if (afterInvalidate !== null) {
      throw new Error('Event cache invalidation failed');
    }
    console.log('Event invalidation OK');

    await cacheNamespace.invalidateCategories();
    var afterCatInvalidate = await cacheNamespace.getCategories();
    if (afterCatInvalidate !== null) {
      throw new Error('Categories cache invalidation failed');
    }
    console.log('Categories invalidation OK');

    await cacheNamespace.invalidateVenue(V1);
    var afterVenueInvalidate = await cacheNamespace.getVenue(V1);
    if (afterVenueInvalidate !== null) {
      throw new Error('Venue cache invalidation failed');
    }
    console.log('Venue invalidation OK');

    await cacheNamespace.invalidateSeatAvailability(E1);
    var afterSeatInvalidate = await cacheNamespace.getSeatAvailability(E1);
    if (afterSeatInvalidate !== null) {
      throw new Error('Seat availability invalidation failed');
    }
    console.log('Seat availability invalidation OK');

    // 8. Test generic invalidate
    console.log('Testing generic invalidate...');
    await cacheNamespace.setEvent(E2, { id: E2, name: 'Test' });
    await cacheNamespace.invalidate('event', E2);
    var afterGeneric = await cacheNamespace.getEvent(E2);
    if (afterGeneric !== null) {
      throw new Error('Generic event invalidation failed');
    }
    console.log('Generic invalidation OK');

    // 9. Test pattern invalidation via delByPattern (SCAN)
    console.log('Testing pattern-based invalidation...');
    await cacheNamespace.setEvent(E2, { id: E2, name: 'Pattern Test' });
    await cacheNamespace.setEvent(E3, { id: E3, name: 'Pattern Test 2' });
    await cacheNamespace.delByPattern(P.EVENT + ':*');
    var afterPattern = await cacheNamespace.getEvent(E2);
    if (afterPattern !== null) {
      throw new Error('Pattern invalidation failed for E2');
    }
    var afterPattern2 = await cacheNamespace.getEvent(E3);
    if (afterPattern2 !== null) {
      throw new Error('Pattern invalidation failed for E3');
    }
    console.log('Pattern-based invalidation OK');

    // 10. Test delByPattern fallback via direct cacheProvider (verifies MemoryCache fallback path)
    console.log('Testing delByPattern across Redis+MemoryCache...');
    await cacheProvider.set('test:fallback:a', 'value-a');
    await cacheProvider.set('test:fallback:b', 'value-b');
    await cacheProvider.set('test:other:x', 'value-x');
    await cacheProvider.delByPattern('test:fallback:*');
    var fallbackA = await cacheProvider.get('test:fallback:a');
    var fallbackB = await cacheProvider.get('test:fallback:b');
    var otherX = await cacheProvider.get('test:other:x');
    if (fallbackA !== null) throw new Error('delByPattern did not delete test:fallback:a');
    if (fallbackB !== null) throw new Error('delByPattern did not delete test:fallback:b');
    if (otherX === null) throw new Error('delByPattern incorrectly deleted non-matching key test:other:x');
    console.log('delByPattern cross-provider OK');

    // 11. Test delByPattern with trailing wildcard (no matches)
    console.log('Testing delByPattern with no matching keys...');
    await cacheProvider.delByPattern('test:nonexistent:*');
    console.log('delByPattern no-match OK');

    console.log('');
    console.log('Cache Namespace Smoke Test PASSED!');
  } finally {
    // Add fallback test keys to cleanup
    TEST_KEYS.push('test:fallback:a', 'test:fallback:b', 'test:other:x');
    await cleanup();
  }
}

smoke().catch(function(err) {
  console.error('Smoke test failed: ' + err.message);
  process.exit(1);
});
