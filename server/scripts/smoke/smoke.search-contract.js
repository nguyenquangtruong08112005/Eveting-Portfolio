// Smoke test for Search Parameter Aliases & Contract Compatibility
// Proves web-shaped params (city, dateFrom, dateTo) and legacy-shaped params (location, startDate, endDate)
// produce equivalent normalized search queries and DB/ES results.
//
// Usage:
//   node scripts/smoke/smoke.search-contract.js
//   DATABASE_URL=postgres://... node scripts/smoke/smoke.search-contract.js

require('dotenv').config({ quiet: true });
const assert = require('assert');
require('../../src/alias-bootstrap');

const {
    normalizeSearchParams,
    parseDateToMs,
    buildSearchQuery
} = require('../../src/modules/events/application/query-builders/search-query.builder');

let passedTests = 0;
let totalTests = 0;

function runTest(description, testFn) {
    totalTests++;
    try {
        testFn();
        console.log(`✅ PASS: ${description}`);
        passedTests++;
    } catch (err) {
        console.error(`❌ FAIL: ${description}`);
        console.error(`   ${err.message}`);
        process.exitCode = 1;
    }
}

async function runAsyncTest(description, testFn) {
    totalTests++;
    try {
        await testFn();
        console.log(`✅ PASS: ${description}`);
        passedTests++;
    } catch (err) {
        console.error(`❌ FAIL: ${description}`);
        console.error(`   ${err.stack || err.message || err}`);
        process.exitCode = 1;
    }
}

console.log('=== Running Search Contract Compatibility Tests ===\n');

// Test 1: Date Parser
runTest('parseDateToMs handles numeric, string, and ISO date inputs', () => {
    const numMs = 1769299200000;
    const strMs = '1769299200000';
    const isoDate = '2026-07-25';

    assert.strictEqual(parseDateToMs(numMs), numMs);
    assert.strictEqual(parseDateToMs(strMs), numMs);
    assert.ok(typeof parseDateToMs(isoDate) === 'number' && !isNaN(parseDateToMs(isoDate)));
    assert.ok(parseDateToMs(isoDate, true) > parseDateToMs(isoDate, false)); // End of day is larger
    assert.strictEqual(parseDateToMs(null), null);
    assert.strictEqual(parseDateToMs(''), null);
});

// Test 2: Parameter Normalization & Precedence
runTest('normalizeSearchParams maps web and legacy aliases equivalently', () => {
    const webParams = {
        city: 'Hà Nội',
        dateFrom: '2026-07-25',
        dateTo: '2026-12-31',
        category: 'music',
        minPrice: '100000',
        maxPrice: '500000'
    };

    const legacyParams = {
        location: 'Hà Nội',
        startDate: '2026-07-25',
        endDate: '2026-12-31',
        category: 'music',
        minPrice: '100000',
        maxPrice: '500000'
    };

    const normWeb = normalizeSearchParams(webParams);
    const normLegacy = normalizeSearchParams(legacyParams);

    assert.strictEqual(normWeb.city, 'Hà Nội');
    assert.strictEqual(normWeb.location, 'Hà Nội');
    assert.strictEqual(normWeb.startDate, '2026-07-25');
    assert.strictEqual(normWeb.dateFrom, '2026-07-25');
    assert.strictEqual(normWeb.endDate, '2026-12-31');
    assert.strictEqual(normWeb.dateTo, '2026-12-31');

    assert.strictEqual(normLegacy.city, 'Hà Nội');
    assert.strictEqual(normLegacy.location, 'Hà Nội');
    assert.strictEqual(normLegacy.startDate, '2026-07-25');
    assert.strictEqual(normLegacy.dateFrom, '2026-07-25');
    assert.strictEqual(normLegacy.endDate, '2026-12-31');
    assert.strictEqual(normLegacy.dateTo, '2026-12-31');
});

runTest('normalizeSearchParams respects alias precedence when both are supplied', () => {
    const dualParams = {
        city: 'Hà Nội',
        location: 'Hồ Chí Minh',
        dateFrom: '2026-07-25',
        startDate: '2026-01-01',
        dateTo: '2026-12-31',
        endDate: '2026-06-30',
    };

    const norm = normalizeSearchParams(dualParams);
    assert.strictEqual(norm.city, 'Hà Nội', 'city should take precedence over location');
    assert.strictEqual(norm.startDate, '2026-07-25', 'dateFrom should take precedence over startDate');
    assert.strictEqual(norm.endDate, '2026-12-31', 'dateTo should take precedence over endDate');
});

// Test 3: Elasticsearch Query Builder Equivalence
runTest('buildSearchQuery generates identical ES query structure for web vs legacy params', () => {
    const webParams = { city: 'Hà Nội', dateFrom: '2026-07-25', dateTo: '2026-12-31', category: 'music' };
    const legacyParams = { location: 'Hà Nội', startDate: '2026-07-25', endDate: '2026-12-31', category: 'music' };

    const esWeb = buildSearchQuery(webParams);
    const esLegacy = buildSearchQuery(legacyParams);

    assert.deepStrictEqual(esWeb.query, esLegacy.query, 'ES queries must be identical for web and legacy aliases');
    assert.strictEqual(esWeb.limit, esLegacy.limit);
    assert.strictEqual(esWeb.offset, esLegacy.offset);
});

// Test 4: Postgres Repository Search (if DB is running)
async function runDbTests() {
    if (!process.env.DATABASE_URL) {
        console.log('\n⚠️ Skipping Postgres live DB tests because DATABASE_URL is not set.');
        return;
    }

    const { query } = require('../../src/providers/database/postgres.client');
    try {
        await query('SELECT 1');
    } catch (err) {
        console.log('\n⚠️ Skipping Postgres live DB query test because DB connection is unavailable:', err.message || err.code || err);
        return;
    }

    const eventRepo = require('../../src/providers/database/event.repository');

    await runAsyncTest('Postgres searchPublicEvents produces equivalent results for web and legacy params', async () => {
        const webParams = { city: 'Hà Nội', category: 'music' };
        const legacyParams = { location: 'Hà Nội', category: 'music' };

        const resWeb = await eventRepo.searchPublicEvents(webParams);
        const resLegacy = await eventRepo.searchPublicEvents(legacyParams);

        assert.strictEqual(resWeb.totalItems, resLegacy.totalItems, 'Postgres totalItems count must match');
        assert.deepStrictEqual(
            resWeb.entries.map(e => e.id),
            resLegacy.entries.map(e => e.id),
            'Postgres entry IDs must match'
        );
    });
}

runDbTests().then(() => {
    console.log(`\n=== Summary: ${passedTests}/${totalTests} passed ===`);
    if (process.exitCode === 1) {
        process.exit(1);
    }
});
