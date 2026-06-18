#!/usr/bin/env node
/**
 * smoke.concurrent-booking.js
 *
 * Validates that concurrent ticket bookings under high load:
 *  1. Do NOT oversell available ticket inventory.
 *  2. Return exactly 3 successful bookings (201) and 7 conflict failures (409)
 *     when 10 concurrent bookings are made for an event with only 3 available tickets.
 *  3. Keep the database state consistent.
 *
 * Run: node scripts/smoke.concurrent-booking.js
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

require('./../src/alias-bootstrap');

const { v4: uuidv4 } = require('uuid');
const http = require('http');
const axios = require('axios');
const app = require('../src/app');
const { query } = require('@/providers/database/postgres.client');
const eventRepository = require('@/providers/database/event.repository');
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
    console.log('smoke.concurrent-booking.js');
    console.log('───────────────────────────');

    const PORT = 3001;
    const server = http.createServer(app);

    // Start in-process server
    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`  [Server] Listening on port ${PORT}`);

    const testUserId = `usr_conc_${uuidv4()}`;
    const testUserEmail = `conc_${uuidv4()}@test.com`;
    const testEventId = `evt_conc_${uuidv4()}`;
    const now = Date.now();

    console.log('\n  [Setup]');

    // Insert synthetic test user in database
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'Concurrent Test User', 'mock_hash', $3, true)`,
        [testUserId, testUserEmail, ['user']]
    );
    assert('test user created in database', true);

    const testUserToken = signAccessToken({ uid: testUserId, email: testUserEmail, roles: ['user'] });

    // Set standard tickets available = 3, total = 3
    const ticketTypes = {
        standard: { name: 'Standard', price: 50000, available: 3, total: 3 },
    };

    const eventData = {
        name: 'Concurrent Booking Test Event',
        description: 'Concurrency testing event',
        date: now,
        eventType: 'physical',
        organizerId: `org_${uuidv4()}`,
        ticketTypes: ticketTypes,
        minPrice: 50000,
        status: 'active',
        visibility: 'public',
        category: ['education'],
        tags: ['tech'],
        sponsors: [],
        createdAt: now,
        lastUpdatedAt: now,
    };

    await eventRepository.createEvent(testEventId, eventData);
    assert(`test event "${testEventId}" created with 3 available tickets`, true);

    console.log('\n  [Firing 10 Concurrent Booking Requests]');

    // Prepare 10 concurrent requests
    const requests = [];
    const client = axios.create({
        baseURL: `http://localhost:${PORT}`,
        headers: {
            Authorization: `Bearer ${testUserToken}`,
            'Content-Type': 'application/json'
        }
    });

    for (let i = 0; i < 10; i++) {
        requests.push(
            client.post('/tickets/book', {
                eventId: testEventId,
                ticketType: 'standard',
                quantity: 1
            }).catch(err => {
                // Return response structure for error handling so we can map status codes
                return err.response;
            })
        );
    }

    const responses = await Promise.all(requests);

    let successCount = 0;
    let conflictCount = 0;
    let otherCount = 0;

    responses.forEach((res, idx) => {
        if (!res) {
            otherCount++;
            return;
        }
        if (res.status === 201) {
            successCount++;
        } else if (res.status === 409) {
            conflictCount++;
        } else {
            console.log(`    Request ${idx + 1} returned status ${res.status}:`, res.data);
            otherCount++;
        }
    });

    console.log('\n  [Booking Results]');
    assert(`exactly 3 successful bookings (status 201): received ${successCount}`, successCount === 3);
    assert(`exactly 7 conflict failures (status 409): received ${conflictCount}`, conflictCount === 7);
    assert(`zero other status codes: received ${otherCount}`, otherCount === 0);

    // Fetch final database state
    console.log('\n  [Database Verification]');
    const dbEvent = await eventRepository.getEventById(testEventId);
    assert('available ticket count in DB projection is 0', dbEvent.ticketTypes.standard.available === 0);

    const row = (await query('SELECT ticket_types, raw_data FROM events WHERE id = $1', [testEventId])).rows[0];
    assert('typed ticket_types standard available is 0', row.ticket_types.standard.available === 0);
    assert('raw_data standard available is 0', row.raw_data.ticketTypes.standard.available === 0);

    const ticketCountResult = await query('SELECT COUNT(*)::int AS count FROM tickets WHERE event_id = $1', [testEventId]);
    assert('exactly 3 tickets created in tickets table', ticketCountResult.rows[0].count === 3);

    console.log('\n  [Cleanup]');

    // Remove orders/payment attempts created as side-effects
    const ticketRows = (await query('SELECT id FROM tickets WHERE event_id = $1', [testEventId])).rows;
    for (const tRow of ticketRows) {
        try {
            const linkResult = await query('SELECT order_id FROM tickets WHERE id = $1', [tRow.id]);
            const orderId = linkResult.rows[0]?.order_id;
            if (orderId) {
                await query('UPDATE tickets SET order_id = NULL, order_item_id = NULL, payment_attempt_id = NULL WHERE id = $1', [tRow.id]);
                await query('DELETE FROM payment_attempts WHERE order_id = $1', [orderId]);
                await query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
                await query('DELETE FROM orders WHERE id = $1', [orderId]);
            }
        } catch (e) {
            // ignore
        }
    }

    await query('DELETE FROM tickets WHERE event_id = $1', [testEventId]);
    await query('DELETE FROM events WHERE id = $1', [testEventId]);
    await query('DELETE FROM sessions WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM auth_users WHERE id = $1', [testUserId]);
    assert('database cleaned up successfully', true);

    // Stop server
    await new Promise((resolve) => server.close(resolve));
    console.log('  [Server] Stopped');

    console.log('');
    console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
    console.log('');

    process.exit(FAIL.length > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
