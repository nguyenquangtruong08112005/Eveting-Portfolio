#!/usr/bin/env node

require('dotenv').config({ quiet: true });
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
require('../../src/alias-bootstrap');

const { randomUUID } = require('crypto');
const http = require('http');
const { query, getPool } = require('@/providers/database/postgres.client');
const seatRepository = require('@/providers/database/seat.repository');
const cacheProvider = require('@/shared/cache/cache-provider');
const { signAccessToken } = require('@/providers/auth/backend.auth.provider');
const app = require('@/app');

if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required.');
    process.exit(1);
}

const contenderCount = 100;
const suffix = randomUUID();
const eventId = `evt_phase06_race_${suffix}`;
const mapId = `map_phase06_race_${suffix}`;
const sectionId = `section_phase06_race_${suffix}`;
const performanceId = `perf_phase06_race_${suffix}`;
const seatId = `seat_phase06_race_${suffix}`;
const userIds = Array.from(
    { length: contenderCount },
    (_, index) => `usr_phase06_race_${index}_${suffix}`
);
const server = http.createServer(app);

function assert(condition, message) {
    if (!condition) throw new Error(message);
    console.log(`PASS: ${message}`);
}

async function setup() {
    const emails = userIds.map((_, index) => `phase06_race_${index}_${suffix}@example.test`);
    await query(
        `INSERT INTO auth_users (id, email, password_hash, roles, email_verified)
         SELECT id, email, 'not-used', ARRAY['user']::text[], true
         FROM UNNEST($1::text[], $2::text[]) AS users(id, email)`,
        [userIds, emails]
    );
    await query(
        `INSERT INTO events (id, name, lifecycle_status, visibility, raw_data)
         VALUES ($1, $2, 'published', 'public', $3::jsonb)`,
        [eventId, 'Phase 06 Race', JSON.stringify({ seatMapId: mapId })]
    );
    await seatRepository.createSeatMap(mapId, {
        name: 'Phase 06 Race Hall',
        totalRows: 1,
        totalCols: 1,
        createdAt: Date.now()
    });
    await seatRepository.createSeatSections([{
        id: sectionId,
        seatMapId: mapId,
        name: 'Race',
        priceMultiplier: 1,
        createdAt: Date.now()
    }]);
    await seatRepository.createSeats([{
        id: seatId,
        seatSectionId: sectionId,
        rowName: 'A',
        seatNumber: 1,
        status: 'available',
        createdAt: Date.now()
    }]);
    await seatRepository.createPerformance({
        id: performanceId,
        eventId,
        seatMapId: mapId,
        startsAt: Date.now() + 3600000,
        status: 'SCHEDULED',
        isDefault: true
    });
    await seatRepository.materializePerformanceSeats(performanceId);
}

async function cleanup() {
    await query('DELETE FROM events WHERE id = $1', [eventId]);
    await query('DELETE FROM seat_maps WHERE id = $1', [mapId]);
    await query('DELETE FROM auth_users WHERE id = ANY($1::text[])', [userIds]);
}

async function run() {
    await setup();

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const endpoint = `http://127.0.0.1:${address.port}/tickets/events/${eventId}/seats/hold`;
    const startedAt = Date.now();
    const responses = await Promise.all(userIds.map((userId) => (
        fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${signAccessToken({
                    uid: userId,
                    emailVerified: true,
                    roles: ['user']
                })}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': randomUUID()
            },
            body: JSON.stringify({
                performanceId,
                seatIds: [seatId]
            })
        })
    )));
    const responseBodies = await Promise.all(responses.map((response) => response.json()));
    const elapsedMs = Date.now() - startedAt;
    const successes = responses.filter((response) => response.status === 201);
    const conflicts = responses.filter((response, index) => (
        response.status === 409
        && responseBodies[index]
        && responseBodies[index].error
        && responseBodies[index].error.code === 'SEAT_ALREADY_RESERVED'
    ));

    if (successes.length !== 1) {
        console.error(`First unexpected response: ${JSON.stringify(responseBodies[0])}`);
    }
    assert(successes.length === 1, '100-way HTTP same-seat race has exactly one 201 success');
    assert(conflicts.length === contenderCount - 1,
        'all losing HTTP requests are 409 SEAT_ALREADY_RESERVED conflicts');

    const stateResult = await query(
        `SELECT
             COUNT(*) FILTER (WHERE status IN ('HELD', 'SOLD'))::int AS reserved_count,
             COUNT(*) FILTER (WHERE status = 'HELD')::int AS held_count
         FROM performance_seats
         WHERE performance_id = $1 AND seat_id = $2`,
        [performanceId, seatId]
    );
    assert(stateResult.rows[0].reserved_count === 1, 'database contains one reserved performance seat');
    assert(stateResult.rows[0].held_count === 1, 'winning hold is the only active hold');

    const holdResult = await query(
        `SELECT COUNT(*)::int AS active_hold_count
         FROM seat_holds
         WHERE performance_id = $1 AND seat_id = $2 AND status = 'held'`,
        [performanceId, seatId]
    );
    assert(holdResult.rows[0].active_hold_count === 1, 'hold audit contains one active row');

    const throughput = Math.round((contenderCount / Math.max(elapsedMs, 1)) * 1000);
    console.log(`Race result: 1 success, ${conflicts.length} conflicts, ${elapsedMs} ms, ${throughput} requests/s`);
}

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        try {
            await cleanup();
        } catch (error) {
            console.error(`Cleanup failed: ${error.message}`);
            process.exitCode = 1;
        }
        if (server.listening) {
            await new Promise((resolve) => server.close(resolve));
        }
        await cacheProvider.disconnect();
        await getPool().end();
    });
