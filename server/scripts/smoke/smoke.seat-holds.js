#!/usr/bin/env node
/**
 * smoke.seat-holds.js
 *
 * Validates:
 *  1. Repository methods for seat map, sections, seats
 *  2. Repository methods for creating, getting, releasing, and expiring seat holds
 *  3. Dynamic seat status model (available, held, sold, blocked)
 *
 * Run: node scripts/smoke.seat-holds.js
 */

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.DATABASE_PROVIDER = 'postgres';

require('../../src/alias-bootstrap');

const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const seatRepository = require('@/providers/database/seat.repository');
const eventRepository = require('@/providers/database/event.repository');

const PASS = [];
const FAIL = [];

function assert(label, condition) {
    if (condition) {
        console.log(`  ✓ ${label}`);
        PASS.push(label);
    } else {
        console.log(`  ✗ ${label}`);
        FAIL.push(label);
    }
}

async function run() {
    console.log('');
    console.log('smoke.seat-holds.js');
    console.log('───────────────────');

    const mapId = `map_${uuidv4()}`;
    const sectionId = `sec_${uuidv4()}`;
    const seatId1 = `seat_${uuidv4()}`; // to be held
    const seatId2 = `seat_${uuidv4()}`; // to be blocked
    const seatId3 = `seat_${uuidv4()}`; // to remain available
    const eventId = `evt_${uuidv4()}`;
    const userId = `usr_${uuidv4()}`;
    const ticketId = `tkt_${uuidv4()}`;
    const now = Date.now();

    console.log('\n  [Setup Test Event and Seat Map]');

    // 1. Create Event (required for foreign key in seat_holds)
    await eventRepository.createEvent(eventId, {
        name: 'Seat Hold Test Event',
        date: now,
        status: 'active',
        visibility: 'public',
        seatMapId: mapId,
        raw_data: { seatMapId: mapId } // Link seatMapId directly in raw_data
    });
    assert('test event created', true);

    // 2. Create Seat Map
    await seatRepository.createSeatMap(mapId, {
        name: 'Main Hall',
        totalRows: 10,
        totalCols: 10,
        createdAt: now
    });
    assert('seat map created', true);

    // 3. Create Seat Section
    await seatRepository.createSeatSections([
        {
            id: sectionId,
            seatMapId: mapId,
            name: 'VIP Front Row',
            priceMultiplier: 1.5,
            createdAt: now
        }
    ]);
    assert('seat section created', true);

    // 4. Create Seats (including one blocked)
    await seatRepository.createSeats([
        {
            id: seatId1,
            seatSectionId: sectionId,
            rowName: 'A',
            seatNumber: 1,
            status: 'available',
            createdAt: now
        },
        {
            id: seatId2,
            seatSectionId: sectionId,
            rowName: 'A',
            seatNumber: 2,
            status: 'blocked',
            createdAt: now
        },
        {
            id: seatId3,
            seatSectionId: sectionId,
            rowName: 'A',
            seatNumber: 3,
            status: 'available',
            createdAt: now
        }
    ]);
    assert('seats created', true);

    // Verify initial statuses are all available / blocked
    let seatsWithStatuses = await seatRepository.getSeatsWithStatuses(eventId);
    assert('getSeatsWithStatuses returned correct length', seatsWithStatuses.length === 3);

    const s1 = seatsWithStatuses.find(s => s.id === seatId1);
    const s2 = seatsWithStatuses.find(s => s.id === seatId2);
    const s3 = seatsWithStatuses.find(s => s.id === seatId3);

    assert('seat 1 is initially available', s1.status === 'available');
    assert('seat 2 is blocked structurally', s2.status === 'blocked');
    assert('seat 3 is initially available', s3.status === 'available');

    // ── 5. Create Seat Hold ──
    console.log('\n  [Create Seat Hold]');
    
    const holdId1 = `hold_${uuidv4()}`;
    const expiresAt = now + 10 * 60 * 1000; // 10 mins TTL

    await seatRepository.createSeatHold({
        id: holdId1,
        eventId,
        seatId: seatId1,
        userId,
        heldAt: now,
        expiresAt,
        status: 'held',
        createdAt: now
    });
    assert('seat hold created successfully', true);

    // Get seat hold
    const hold = await seatRepository.getSeatHold(holdId1);
    assert('getSeatHold returns correct data', hold && hold.id === holdId1 && hold.status === 'held');

    // Get active hold for seat
    const activeHold = await seatRepository.getActiveHoldForSeat(eventId, seatId1);
    assert('getActiveHoldForSeat returns active hold', activeHold && activeHold.id === holdId1);

    // Verify status updated to held
    seatsWithStatuses = await seatRepository.getSeatsWithStatuses(eventId);
    const s1Held = seatsWithStatuses.find(s => s.id === seatId1);
    assert('seat 1 status is now "held"', s1Held.status === 'held');

    // ── 6. Verify Concurrency / Duplicate Hold Prevention ──
    console.log('\n  [Verify Duplicate Hold Rejection]');

    const holdIdDup = `hold_${uuidv4()}`;
    try {
        await seatRepository.createSeatHold({
            id: holdIdDup,
            eventId,
            seatId: seatId1, // try to hold same seat
            userId: `usr_other_${uuidv4()}`,
            heldAt: now,
            expiresAt,
            status: 'held',
            createdAt: now
        });
        assert('duplicate seat hold was NOT rejected (should fail)', false);
    } catch (error) {
        assert('duplicate seat hold rejected (failed unique constraint)', error.message.includes('unique constraint') || error.code === '23505');
    }

    // ── 7. Convert Hold to Sold ──
    console.log('\n  [Convert Hold to Sold]');

    // Insert a dummy ticket (simulates payment checkout completing and ticket created)
    await query(
        `INSERT INTO tickets (id, event_id, user_id, type, price, seat, status, purchase_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [ticketId, eventId, userId, 'vip', 150000, seatId1, 'active', now]
    );
    assert('associated ticket created', true);

    // Mark the hold as sold
    await seatRepository.convertHoldToSold(holdId1);
    const updatedHold = await seatRepository.getSeatHold(holdId1);
    assert('hold status converted to sold', updatedHold.status === 'sold');

    // Verify dynamic status is now sold
    seatsWithStatuses = await seatRepository.getSeatsWithStatuses(eventId);
    const s1Sold = seatsWithStatuses.find(s => s.id === seatId1);
    assert('seat 1 status is now "sold"', s1Sold.status === 'sold');

    // ── 8. Verify Release Hold ──
    console.log('\n  [Release / Expiry]');

    // Create another hold on seat 3 that will expire soon
    const holdId2 = `hold_${uuidv4()}`;
    const expiredTime = now + 5000; // 5 seconds in future
    await seatRepository.createSeatHold({
        id: holdId2,
        eventId,
        seatId: seatId3,
        userId,
        heldAt: now,
        expiresAt: expiredTime,
        status: 'held',
        createdAt: now
    });

    // Verify it is initially held
    seatsWithStatuses = await seatRepository.getSeatsWithStatuses(eventId);
    const s3HeldBefore = seatsWithStatuses.find(s => s.id === seatId3);
    assert('seat 3 is held before release', s3HeldBefore.status === 'held');

    // Run expiration cleanup with a time after expiredTime to trigger release
    const releasedIds = await seatRepository.releaseExpiredHolds(now + 10000);
    assert('expired hold was released', releasedIds.includes(holdId2));

    // Verify dynamic status is back to available
    seatsWithStatuses = await seatRepository.getSeatsWithStatuses(eventId);
    const s3Released = seatsWithStatuses.find(s => s.id === seatId3);
    assert('seat 3 status is now back to "available"', s3Released.status === 'available');

    // ── 9. Cleanup ──
    console.log('\n  [Cleanup]');
    await query('DELETE FROM seat_holds WHERE event_id = $1', [eventId]);
    await query('DELETE FROM tickets WHERE event_id = $1', [eventId]);
    await query('DELETE FROM seats WHERE seat_section_id = $1', [sectionId]);
    await query('DELETE FROM seat_sections WHERE seat_map_id = $1', [mapId]);
    await query('DELETE FROM seat_maps WHERE id = $1', [mapId]);
    await query('DELETE FROM events WHERE id = $1', [eventId]);
    assert('cleanup successful', true);

    console.log('');
    console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
    console.log('');

    process.exit(FAIL.length > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unhandled error in smoke test:', err);
    process.exit(1);
});
