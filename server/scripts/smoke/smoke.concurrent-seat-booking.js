#!/usr/bin/env node
/**
 * smoke.concurrent-seat-booking.js
 *
 * Validates:
 *  1. Two users concurrently trying to hold the same seat. Exactly one succeeds, other fails with 409 Conflict.
 *  2. The winner can book the held seat.
 *  3. The loser is rejected from booking.
 */

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.DATABASE_PROVIDER = 'postgres';
process.env.EVENT_DATABASE_PROVIDER = 'postgres';
process.env.ORDER_DATABASE_PROVIDER = 'postgres';
process.env.TICKET_DATABASE_PROVIDER = 'postgres';
process.env.AUTH_PROVIDER = 'backend';

require('../../src/alias-bootstrap');

const { v4: uuidv4 } = require('uuid');
const http = require('http');
const axios = require('axios');
const app = require('../../src/app');
const { initSocketServer } = require('@/shared/socket/socket-server');
const { query } = require('@/providers/database/postgres.client');
const eventRepository = require('@/providers/database/event.repository');
const seatRepository = require('@/providers/database/seat.repository');
const { signAccessToken } = require('@/providers/auth/backend.auth.provider');

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
    console.log('smoke.concurrent-seat-booking.js');
    console.log('────────────────────────────────');

    const PORT = 3002;
    const server = http.createServer(app);
    initSocketServer(server);

    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`  [Server] Listening on port ${PORT}`);

    const userAId = `usr_seat_a_${uuidv4()}`;
    const userAEmail = `seat_a_${uuidv4()}@test.com`;
    const userBId = `usr_seat_b_${uuidv4()}`;
    const userBEmail = `seat_b_${uuidv4()}@test.com`;
    
    const testEventId = `evt_seat_c_${uuidv4()}`;
    const testMapId = `map_seat_c_${uuidv4()}`;
    const testSectionId = `sec_seat_c_${uuidv4()}`;
    const testSeatId = `seat_test_c_${uuidv4()}`;
    const now = Date.now();

    console.log('\n  [Setup Users, Event, & Seats]');

    // Insert User A & B
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'User A', 'mock_hash', $3, true)`,
        [userAId, userAEmail, ['user']]
    );
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'User B', 'mock_hash', $3, true)`,
        [userBId, userBEmail, ['user']]
    );

    const tokenA = signAccessToken({ uid: userAId, email: userAEmail, roles: ['user'] });
    const tokenB = signAccessToken({ uid: userBId, email: userBEmail, roles: ['user'] });

    // Insert Event
    const ticketTypes = {
        standard: { name: 'Standard', price: 100000, available: 10, total: 10 },
    };
    await eventRepository.createEvent(testEventId, {
        name: 'Concurrent Seat Booking Event',
        description: 'Testing concurrency',
        date: now,
        eventType: 'physical',
        organizerId: `org_${uuidv4()}`,
        ticketTypes: ticketTypes,
        minPrice: 100000,
        status: 'active',
        visibility: 'public',
        seatMapId: testMapId,
        createdAt: now,
        lastUpdatedAt: now,
    });

    // Insert Seat Map, Section, Seat
    await seatRepository.createSeatMap(testMapId, { name: 'Main Hall', totalRows: 5, totalCols: 5 });
    await seatRepository.createSeatSections([{ id: testSectionId, seatMapId: testMapId, name: 'General Admission' }]);
    await seatRepository.createSeats([{ id: testSeatId, seatSectionId: testSectionId, rowName: 'B', seatNumber: 3, status: 'available' }]);

    assert('Users A & B, Event, and Seats seeded successfully', true);

    const clientA = axios.create({
        baseURL: `http://localhost:${PORT}`,
        headers: { Authorization: `Bearer ${tokenA}`, 'Content-Type': 'application/json' },
        validateStatus: () => true
    });

    const clientB = axios.create({
        baseURL: `http://localhost:${PORT}`,
        headers: { Authorization: `Bearer ${tokenB}`, 'Content-Type': 'application/json' },
        validateStatus: () => true
    });

    console.log('\n  [Test Step 1: Concurrent Seat Hold]');

    // Send holds concurrently
    const [resA, resB] = await Promise.all([
        clientA.post('/tickets/hold-seat', { eventId: testEventId, seatId: testSeatId }),
        clientB.post('/tickets/hold-seat', { eventId: testEventId, seatId: testSeatId })
    ]);

    const aSucceeded = resA.status === 200;
    const bSucceeded = resB.status === 200;

    assert('Exactly one request succeeded', (aSucceeded && !bSucceeded) || (!aSucceeded && bSucceeded));
    assert('Other request failed with 409 Conflict', (resA.status === 409 || resB.status === 409));

    const winnerClient = aSucceeded ? clientA : clientB;
    const loserClient = aSucceeded ? clientB : clientA;
    const winnerId = aSucceeded ? userAId : userBId;
    const loserId = aSucceeded ? userBId : userAId;

    console.log(`  Winner: ${winnerId === userAId ? 'User A' : 'User B'}`);

    console.log('\n  [Test Step 2: Winner Books Seat, Loser Attempts Book]');

    // Winner books seat
    const bookWinnerRes = await winnerClient.post('/tickets/book-held-seats', { eventId: testEventId, seatIds: [testSeatId] });
    assert('Winner successfully booked the seat (201)', bookWinnerRes.status === 201);
    assert('Winner got orderId', !!bookWinnerRes.data.orderId);

    // Loser tries to book
    const bookLoserRes = await loserClient.post('/tickets/book-held-seats', { eventId: testEventId, seatIds: [testSeatId] });
    assert('Loser booking is rejected (403 or 409)', bookLoserRes.status === 403 || bookLoserRes.status === 409);

    // Verify seat is blocked in database
    const seatDb = await seatRepository.getSeatById(testSeatId);
    assert('seat status updated to "blocked" in PostgreSQL database', seatDb.status === 'blocked');

    // Get active hold for seat should be null or sold
    const activeHold = await seatRepository.getActiveHoldForSeat(testEventId, testSeatId);
    assert('No active hold exists in database for this seat anymore', activeHold === null);

    console.log('\n  [Cleanup]');

    // Cleanup orders/tickets for winner
    const winnerOrderId = bookWinnerRes.data.orderId;
    if (winnerOrderId) {
        const ticketRows = (await query('SELECT id FROM tickets WHERE order_id = $1', [winnerOrderId])).rows;
        for (const tRow of ticketRows) {
            await query('UPDATE tickets SET order_id = NULL, order_item_id = NULL, payment_attempt_id = NULL WHERE id = $1', [tRow.id]);
        }
        await query('DELETE FROM order_items WHERE order_id = $1', [winnerOrderId]);
        await query('DELETE FROM orders WHERE id = $1', [winnerOrderId]);
    }
    await query('DELETE FROM seat_holds WHERE event_id = $1', [testEventId]);
    await query('DELETE FROM tickets WHERE event_id = $1', [testEventId]);
    await query('DELETE FROM seats WHERE id = $1', [testSeatId]);
    await query('DELETE FROM seat_sections WHERE id = $1', [testSectionId]);
    await query('DELETE FROM seat_maps WHERE id = $1', [testMapId]);
    await query('DELETE FROM events WHERE id = $1', [testEventId]);
    await query('DELETE FROM auth_users WHERE id IN ($1, $2)', [userAId, userBId]);
    assert('database cleaned up successfully', true);

    await new Promise((resolve) => server.close(resolve));
    console.log('  [Server] Stopped');

    console.log('');
    console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
    console.log('');

    process.exit(FAIL.length > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unhandled error:', err.message || err);
    process.exit(1);
});
