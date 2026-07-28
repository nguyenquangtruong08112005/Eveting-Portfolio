#!/usr/bin/env node

require('dotenv').config({ quiet: true });
require('../../src/alias-bootstrap');

const { randomUUID } = require('crypto');
const { query, getPool } = require('@/providers/database/postgres.client');
const seatRepository = require('@/providers/database/seat.repository');
const ticketService = require('@/modules/tickets/application/service');
const organizerService = require('@/modules/organizer/application/service');
const cacheProvider = require('@/shared/cache/cache-provider');
const { processExpiredHolds } = require('@/jobs/seat-release-worker');

if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required.');
    process.exit(1);
}

const suffix = randomUUID();
const fixture = {
    eventId: `evt_phase06_${suffix}`,
    mapId: `map_phase06_${suffix}`,
    limitMapId: `map_phase06_limit_${suffix}`,
    sectionId: `section_phase06_${suffix}`,
    limitSectionId: `section_phase06_limit_${suffix}`,
    performanceId: `perf_phase06_${suffix}`,
    limitPerformanceId: `perf_phase06_limit_${suffix}`,
    userIds: [`usr_phase06_a_${suffix}`, `usr_phase06_b_${suffix}`],
    seatIds: [
        `seat_phase06_a1_${suffix}`,
        `seat_phase06_a2_${suffix}`,
        `seat_phase06_a3_${suffix}`,
        `seat_phase06_a4_${suffix}`
    ]
};

function assert(condition, message) {
    if (!condition) throw new Error(message);
    console.log(`PASS: ${message}`);
}

async function setup() {
    const emails = fixture.userIds.map((_, index) => `phase06_${index}_${suffix}@example.test`);
    await query(
        `INSERT INTO auth_users (id, email, password_hash, roles)
         SELECT id, email, 'not-used', ARRAY['user']::text[]
         FROM UNNEST($1::text[], $2::text[]) AS users(id, email)`,
        [fixture.userIds, emails]
    );

    await query(
      `INSERT INTO events (id, name, lifecycle_status, visibility, raw_data)
         VALUES ($1, $2, 'published', 'public', $3::jsonb)`,
        [fixture.eventId, 'Phase 06 Seat Smoke', JSON.stringify({ seatMapId: fixture.mapId })]
    );
    await query(
        `INSERT INTO event_ticket_types (
             id, event_id, code, name, price, capacity, available,
             sold_count, sort_order, is_active, created_at, updated_at
         ) VALUES ($1, $2, 'standard', 'Standard', 100000, 4, 4, 0, 0, true, NOW(), NOW())`,
        [`${fixture.eventId}:standard`, fixture.eventId]
    );

    await seatRepository.createSeatMap(fixture.mapId, {
        name: 'Phase 06 Hall',
        totalRows: 1,
        totalCols: 4,
        createdAt: Date.now()
    });
    await seatRepository.createSeatSections([{
        id: fixture.sectionId,
        seatMapId: fixture.mapId,
        name: 'Main',
        priceMultiplier: 1,
        createdAt: Date.now()
    }]);
    await seatRepository.createSeats(fixture.seatIds.map((seatId, index) => ({
        id: seatId,
        seatSectionId: fixture.sectionId,
        rowName: 'A',
        seatNumber: index + 1,
        status: index === 3 ? 'blocked' : 'available',
        createdAt: Date.now()
    })));
    await seatRepository.createPerformance({
        id: fixture.performanceId,
        eventId: fixture.eventId,
        seatMapId: fixture.mapId,
        startsAt: Date.now() + 3600000,
        status: 'SCHEDULED',
        isDefault: true
    });
    await seatRepository.materializePerformanceSeats(fixture.performanceId);
}

async function cleanup() {
    await query('DELETE FROM outbox WHERE payload::text LIKE $1', [`%${fixture.eventId}%`]);
    await query('DELETE FROM tickets WHERE event_id = $1', [fixture.eventId]);
    await query('DELETE FROM order_attendees WHERE event_id = $1', [fixture.eventId]);
    await query('DELETE FROM order_items WHERE event_id = $1', [fixture.eventId]);
    await query('DELETE FROM payment_attempts WHERE order_id IN (SELECT id FROM orders WHERE event_id = $1)', [fixture.eventId]);
    await query('DELETE FROM orders WHERE event_id = $1', [fixture.eventId]);
    await query('DELETE FROM events WHERE id = $1', [fixture.eventId]);
    await query(
        'DELETE FROM seat_maps WHERE id = ANY($1::text[])',
        [[fixture.mapId, fixture.limitMapId]]
    );
    await query('DELETE FROM auth_users WHERE id = ANY($1::text[])', [fixture.userIds]);
}

async function verifyPerformanceSeatLimit() {
    await seatRepository.createSeatMap(fixture.limitMapId, {
        name: 'Phase 06 Limit Hall',
        totalRows: 1,
        totalCols: 501,
        createdAt: Date.now()
    });
    await seatRepository.createSeatSections([{
        id: fixture.limitSectionId,
        seatMapId: fixture.limitMapId,
        name: 'Limit',
        priceMultiplier: 1,
        createdAt: Date.now()
    }]);
    let limitError = null;
    try {
        await query(
            `INSERT INTO seats (
                 id, seat_section_id, row_name, seat_number, status, created_at
             )
             SELECT
                 $1 || seat_number::text,
                 $2,
                 'L',
                 seat_number,
                 'available',
                 NOW()
             FROM GENERATE_SERIES(1, 501) AS generated(seat_number)`,
            [`seat_phase06_limit_${suffix}_`, fixture.limitSectionId]
        );
    } catch (error) {
        limitError = error;
    }
    assert(limitError && limitError.code === '23514',
        'database rejects a 501-seat layout');

    const countResult = await query(
        `SELECT COUNT(*)::int AS count
         FROM seats
         WHERE seat_section_id = $1`,
        [fixture.limitSectionId]
    );
    assert(countResult.rows[0].count === 0,
        'failed 501-seat layout creation rolls back the entire statement');
}

async function run() {
    await setup();
    await verifyPerformanceSeatLimit();

    const savedLayout = await organizerService.saveSeatLayout(
        fixture.eventId,
        fixture.performanceId,
        {
            version: 1,
            sections: [{
                id: 'main',
                name: 'Main',
                rows: [{
                    id: 'row-a',
                    label: 'A',
                    seats: [{ id: 'a1', label: 'A1', blocked: false }]
                }]
            }]
        }
    );
    assert(savedLayout.layout.sections[0].rows[0].seats.length === 1,
        'organizer layout save persists a performance-scoped layout');
    const loadedLayout = await organizerService.getSeatLayout(
        fixture.eventId,
        fixture.performanceId
    );
    assert(loadedLayout.version === savedLayout.version,
        'organizer layout load returns the persisted layout version');

    const initial = await ticketService.getPerformanceSeatAvailability(
        fixture.eventId,
        fixture.performanceId
    );
    assert(initial.seats.length === 4, 'availability returns all materialized seats');
    assert(initial.seats.find((seat) => seat.seatId === fixture.seatIds[3]).status === 'BLOCKED',
        'structurally blocked seat remains BLOCKED');

    const firstHold = await ticketService.holdPerformanceSeats(
        fixture.userIds[0],
        fixture.eventId,
        fixture.performanceId,
        [fixture.seatIds[0]]
    );
    assert(firstHold.status === 'HELD', 'single seat hold succeeds');
    assert(firstHold.expiresAt - Date.now() > 599000, 'hold TTL is fixed at ten minutes');

    let conflict = null;
    try {
        await ticketService.holdPerformanceSeats(
            fixture.userIds[1],
            fixture.eventId,
            fixture.performanceId,
            [fixture.seatIds[0], fixture.seatIds[1]]
        );
    } catch (error) {
        conflict = error;
    }
    assert(conflict && conflict.statusCode === 409 && conflict.code === 'SEAT_ALREADY_RESERVED',
        'mixed-availability batch returns SEAT_ALREADY_RESERVED');

    const afterRollback = await seatRepository.getPerformanceSeatAvailability(
        fixture.eventId,
        fixture.performanceId
    );
    assert(afterRollback.seats.find((seat) => seat.seatId === fixture.seatIds[1]).status === 'AVAILABLE',
        'failed batch leaves every otherwise-available seat unchanged');

    await ticketService.releasePerformanceSeatHold(
        fixture.userIds[0],
        fixture.eventId,
        fixture.performanceId,
        firstHold.holdToken,
        firstHold.seatIds
    );

    const checkoutHold = await ticketService.holdPerformanceSeats(
        fixture.userIds[0],
        fixture.eventId,
        fixture.performanceId,
        [fixture.seatIds[0]]
    );
    const checkout = await ticketService.createCheckout(fixture.userIds[0], {
        eventId: fixture.eventId,
        items: [{ ticketType: 'standard', quantity: 1 }],
        seatHold: {
            performanceId: fixture.performanceId,
            holdToken: checkoutHold.holdToken,
            seatIds: checkoutHold.seatIds
        }
    });
    const heldBeforePayment = await query(
        'SELECT status FROM performance_seats WHERE performance_id = $1 AND seat_id = $2',
        [fixture.performanceId, fixture.seatIds[0]]
    );
    assert(heldBeforePayment.rows[0].status === 'HELD',
        'checkout leaves a held seat unsold before payment confirmation');
    await ticketService.confirmPaymentForOrder(checkout.orderId, [], 'smoke-seat-payment');
    const soldAfterPayment = await query(
        'SELECT status FROM performance_seats WHERE performance_id = $1 AND seat_id = $2',
        [fixture.performanceId, fixture.seatIds[0]]
    );
    assert(soldAfterPayment.rows[0].status === 'SOLD',
        'successful order payment atomically converts the held seat to SOLD');

    const expiryHold = await ticketService.holdPerformanceSeats(
        fixture.userIds[1],
        fixture.eventId,
        fixture.performanceId,
        [fixture.seatIds[2]]
    );
    await query(
        `UPDATE performance_seats
         SET hold_expires_at = NOW() - INTERVAL '1 second'
         WHERE performance_id = $1 AND seat_id = $2`,
        [fixture.performanceId, fixture.seatIds[2]]
    );
    await query(
        `UPDATE seat_holds
         SET expires_at = NOW() - INTERVAL '1 second'
         WHERE performance_id = $1 AND hold_token = $2`,
        [fixture.performanceId, expiryHold.holdToken]
    );

    const released = await processExpiredHolds();
    assert(released.some((seat) => seat.seatId === fixture.seatIds[2]),
        'release worker claims and releases an expired hold');
    const afterExpiry = await seatRepository.getPerformanceSeatAvailability(
        fixture.eventId,
        fixture.performanceId
    );
    assert(afterExpiry.seats.find((seat) => seat.seatId === fixture.seatIds[2]).status === 'AVAILABLE',
        'expired seat returns to AVAILABLE');

    console.log('Phase 06 seat smoke passed.');
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
        await cacheProvider.disconnect();
        await getPool().end();
    });
