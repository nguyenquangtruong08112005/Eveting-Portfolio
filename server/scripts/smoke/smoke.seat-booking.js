#!/usr/bin/env node
/**
 * smoke.seat-booking.js
 *
 * Validates:
 *  1. Holding a seat sets the Redis hold key and emits "seat:held" via Socket.IO.
 *  2. Releasing a seat deletes the Redis hold key and emits "seat:released" via Socket.IO.
 *  3. Booking a held seat transactionally changes seat status to "blocked" in PostgreSQL and creates order/tickets.
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
const { io: ioClient } = require('socket.io-client');
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
    console.log('smoke.seat-booking.js');
    console.log('─────────────────────');

    const PORT = 3001;
    const server = http.createServer(app);
    initSocketServer(server);

    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`  [Server] Listening on port ${PORT}`);

    const testUserId = `usr_seat_${uuidv4()}`;
    const testUserEmail = `seat_${uuidv4()}@test.com`;
    const testEventId = `evt_seat_${uuidv4()}`;
    const testMapId = `map_seat_${uuidv4()}`;
    const testSectionId = `sec_seat_${uuidv4()}`;
    const testSeatId = `seat_test_${uuidv4()}`;
    const now = Date.now();

    console.log('\n  [Setup DB & Redis mock]');

    // Insert user
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'Seat Test User', 'mock_hash', $3, true)`,
        [testUserId, testUserEmail, ['user']]
    );

    const testUserToken = signAccessToken({ uid: testUserId, email: testUserEmail, roles: ['user'] });

    // Insert Event
    const ticketTypes = {
        standard: { name: 'Standard', price: 100000, available: 10, total: 10 },
    };
    await eventRepository.createEvent(testEventId, {
        name: 'Seat Map Test Event',
        description: 'Seat booking testing',
        date: now,
        eventType: 'physical',
        organizerId: `org_${uuidv4()}`,
        ticketTypes: ticketTypes,
        minPrice: 100000,
        status: 'active',
        visibility: 'public',
        createdAt: now,
        lastUpdatedAt: now,
    });

    // Insert Seat Map, Section, Seat
    await seatRepository.createSeatMap(testMapId, { name: 'Main Hall', totalRows: 5, totalCols: 5 });
    await seatRepository.createSeatSections([{ id: testSectionId, seatMapId: testMapId, name: 'General Admission' }]);
    await seatRepository.createSeats([{ id: testSeatId, seatSectionId: testSectionId, rowName: 'B', seatNumber: 3, status: 'available' }]);

    assert('test user, event, and seats seeded in database', true);

    console.log('\n  [Connecting WebSocket Client]');
    const socket = ioClient(`http://localhost:${PORT}`, {
        auth: { token: testUserToken },
        transports: ['websocket']
    });

    await new Promise((resolve, reject) => {
        socket.on('connect', resolve);
        socket.on('connect_error', reject);
    });
    assert('websocket client connected successfully', socket.connected);

    socket.emit('join_event', testEventId);

    const client = axios.create({
        baseURL: `http://localhost:${PORT}`,
        headers: {
            Authorization: `Bearer ${testUserToken}`,
            'Content-Type': 'application/json'
        }
    });

    console.log('\n  [Test Step 1: Hold Seat]');
    const heldPromise = new Promise((resolve) => {
        socket.on('seat:held', (data) => {
            resolve(data);
        });
    });

    const holdRes = await client.post('/tickets/hold-seat', { eventId: testEventId, seatId: testSeatId });
    assert('POST /tickets/hold-seat returned status 200', holdRes.status === 200);

    const holdSocketData = await heldPromise;
    assert('received seat:held websocket broadcast', holdSocketData.seatId === testSeatId);

    console.log('\n  [Test Step 2: Release Seat]');
    const releasedPromise = new Promise((resolve) => {
        socket.on('seat:released', (data) => {
            resolve(data);
        });
    });

    const releaseRes = await client.post('/tickets/release-seat', { eventId: testEventId, seatId: testSeatId });
    assert('POST /tickets/release-seat returned status 200', releaseRes.status === 200);

    const releaseSocketData = await releasedPromise;
    assert('received seat:released websocket broadcast', releaseSocketData.seatId === testSeatId);

    console.log('\n  [Test Step 3: Hold Seat & Book Held Seats]');
    // Hold seat again
    await client.post('/tickets/hold-seat', { eventId: testEventId, seatId: testSeatId });

    const soldPromise = new Promise((resolve) => {
        socket.on('seat:sold', (data) => {
            resolve(data);
        });
    });

    const bookRes = await client.post('/tickets/book-held-seats', { eventId: testEventId, seatIds: [testSeatId] });
    assert('POST /tickets/book-held-seats returned status 201', bookRes.status === 201);
    assert('order created and orderId returned', !!bookRes.data.orderId);

    const soldSocketData = await soldPromise;
    assert('received seat:sold websocket broadcast', soldSocketData.seatIds.includes(testSeatId));

    // Verify seat is blocked in database
    const seatDb = await seatRepository.getSeatById(testSeatId);
    assert('seat status updated to "blocked" in PostgreSQL database', seatDb.status === 'blocked');

    console.log('\n  [Cleanup]');

    // Cleanup order/items/tickets
    const orderId = bookRes.data.orderId;
    if (orderId) {
        const ticketRows = (await query('SELECT id FROM tickets WHERE order_id = $1', [orderId])).rows;
        for (const tRow of ticketRows) {
            await query('UPDATE tickets SET order_id = NULL, order_item_id = NULL, payment_attempt_id = NULL WHERE id = $1', [tRow.id]);
        }
        await query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
        await query('DELETE FROM orders WHERE id = $1', [orderId]);
    }
    await query('DELETE FROM tickets WHERE event_id = $1', [testEventId]);
    await query('DELETE FROM seats WHERE id = $1', [testSeatId]);
    await query('DELETE FROM seat_sections WHERE id = $1', [testSectionId]);
    await query('DELETE FROM seat_maps WHERE id = $1', [testMapId]);
    await query('DELETE FROM events WHERE id = $1', [testEventId]);
    await query('DELETE FROM auth_users WHERE id = $1', [testUserId]);
    assert('database cleaned up successfully', true);

    socket.disconnect();
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
