#!/usr/bin/env node
/**
 * smoke.idempotency.js
 * Smoke test for Phase P1.3-S4 Idempotent Booking
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

require('../../src/alias-bootstrap');

const { spawn } = require('child_process');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const eventRepository = require('@/providers/database/event.repository');

const TEST_PORT = process.env.TEST_PORT || '35433';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const DATABASE_URL = process.env.DATABASE_URL;

let serverProcess = null;
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
    console.log('');
    console.log('smoke.idempotency.js');
    console.log('────────────────────');

    // 1. Spawn Server
    console.log('Spawning application server...');
    const env = {
        ...process.env,
        PORT: TEST_PORT,
        DATABASE_URL,
        AUTH_PROVIDER: 'backend',
        ACCESS_TOKEN_SECRET: 'idempotency_smoke_test_access_token_secret_value_at_least_256_bits',
        DATABASE_PROVIDER: 'postgres'
    };
    serverProcess = spawn('node', ['src/server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

    let serverStarted = false;
    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Server address') || output.includes('localhost:')) {
            serverStarted = true;
        }
    });

    for (let i = 0; i < 20; i++) {
        if (serverStarted) break;
        try {
            const res = await axios.get(BASE_URL);
            if (res.status === 200) {
                serverStarted = true;
                break;
            }
        } catch (_) {}
        await sleep(500);
    }

    if (!serverStarted) {
        throw new Error('Server failed to start or did not become responsive.');
    }
    console.log('Server is responsive at:', BASE_URL);

    // 2. Setup Test User and Event
    console.log('\n  [Setup Test User & Event]');
    const email = `idempotent_test_${Date.now()}@test.com`;
    const password = 'Password123!';
    const name = 'Idempotency User';

    // Register User
    const regRes = await axios.post(`${BASE_URL}/auth/register`, { email, password, name });
    const accessToken = regRes.data.accessToken;
    const testUserId = regRes.data.user.id;
    assert('Test user registered and logged in', !!accessToken);

    // Create Event
    const testEventId = `evt_idem_${uuidv4()}`;
    const now = Date.now();
    const eventData = {
        name: 'Idempotency Test Event',
        description: 'Test event description',
        date: now + 86400000,
        eventType: 'physical',
        organizerId: testUserId,
        ticketTypes: {
            standard: { name: 'Standard', price: 50000, available: 10, total: 10 }
        },
        minPrice: 50000,
        status: 'active',
        visibility: 'public',
        createdAt: now,
        lastUpdatedAt: now
    };
    await eventRepository.createEvent(testEventId, eventData);
    assert('Test event created', true);

    // 3. Test Explicit Idempotency Key
    console.log('\n  [Test Explicit Idempotency Key (Headers)]');
    const idempotencyKey = `key_${uuidv4()}`;
    const bookPayload = { eventId: testEventId, ticketType: 'standard', quantity: 1 };

    // Request 1
    const res1 = await axios.post(`${BASE_URL}/tickets/book`, bookPayload, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Idempotency-Key': idempotencyKey
        }
    });
    assert('First request succeeds (201)', res1.status === 201);
    const firstTicketId = res1.data.id;
    assert('Ticket was created', !!firstTicketId);

    // Verify availability decreased to 9
    let ev = await eventRepository.getEventById(testEventId);
    assert('Ticket availability decremented to 9', ev.ticketTypes.standard.available === 9);

    // Request 2 (Duplicate)
    const res2 = await axios.post(`${BASE_URL}/tickets/book`, bookPayload, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'X-Idempotency-Key': idempotencyKey
        }
    });
    assert('Second duplicate request returns cached response (201)', res2.status === 201);
    assert('Second response has same ticket ID', res2.data.id === firstTicketId);

    // Verify availability is STILL 9 (no double-decrement)
    ev = await eventRepository.getEventById(testEventId);
    assert('Ticket availability remains 9 (no double-decrement)', ev.ticketTypes.standard.available === 9);

    // Verify database has exactly 1 ticket created for this event
    const ticketCountRes = await query('SELECT COUNT(*)::int as count FROM tickets WHERE event_id = $1', [testEventId]);
    assert('Exactly 1 ticket exists in database', ticketCountRes.rows[0].count === 1);

    // 4. Test Fallback Request Fingerprinting (Double Submit Prevention)
    console.log('\n  [Test Fallback Request Fingerprinting]');
    // Send two identical requests in parallel without idempotency key
    const payloadNoKey = { eventId: testEventId, ticketType: 'standard', quantity: 1 };
    
    console.log('Sending two concurrent requests without explicit key...');
    const reqPromise1 = axios.post(`${BASE_URL}/tickets/book`, payloadNoKey, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const reqPromise2 = axios.post(`${BASE_URL}/tickets/book`, payloadNoKey, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    const results = await Promise.allSettled([reqPromise1, reqPromise2]);
    
    let successCount = 0;
    let conflictCount = 0;
    let fallbackTicketId = null;
    let duplicateReturned = false;

    for (let idx = 0; idx < results.length; idx++) {
        const r = results[idx];
        console.log(`[Concurrent Request ${idx}] Status: ${r.status}`);
        if (r.status === 'fulfilled') {
            successCount++;
            if (!fallbackTicketId) {
                fallbackTicketId = r.value.data.id;
            } else if (fallbackTicketId === r.value.data.id) {
                duplicateReturned = true;
            }
            console.log(`[Concurrent Request ${idx}] Success response data:`, r.value.data);
        } else {
            console.log(`[Concurrent Request ${idx}] Failure response:`, r.reason.response ? { status: r.reason.response.status, data: r.reason.response.data } : r.reason.message);
            if (r.reason.response && r.reason.response.status === 409) {
                conflictCount++;
            } else {
                console.error('Unexpected request failure:', r.reason);
            }
        }
    }

    const passedFingerprintCheck = (successCount === 1 && conflictCount === 1) || (successCount === 2 && duplicateReturned);
    assert('Fallback fingerprint successfully prevented duplicate booking', passedFingerprintCheck);

    // Verify final availability is 8 (since only 1 book succeeded)
    ev = await eventRepository.getEventById(testEventId);
    assert('Final ticket availability decremented to 8', ev.ticketTypes.standard.available === 8);

    // 5. Cleanup
    console.log('\n  [Cleanup]');
    // Delete tickets, orders, and idempotency keys
    await query('DELETE FROM idempotency_keys WHERE key = $1 OR key LIKE $2', [idempotencyKey, `%${testUserId}%`]);
    
    const tickets = await query('SELECT id FROM tickets WHERE event_id = $1', [testEventId]);
    for (const t of tickets.rows) {
        const orderLink = await query('SELECT order_id FROM tickets WHERE id = $1', [t.id]);
        if (orderLink.rows.length > 0 && orderLink.rows[0].order_id) {
            const orderId = orderLink.rows[0].order_id;
            await query('DELETE FROM payment_attempts WHERE order_id = $1', [orderId]);
            await query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
            await query('DELETE FROM orders WHERE id = $1', [orderId]);
        }
    }
    await query('DELETE FROM tickets WHERE event_id = $1', [testEventId]);
    await query('DELETE FROM events WHERE id = $1', [testEventId]);
    await query('DELETE FROM auth_tokens WHERE email = $1', [email]);
    await query('DELETE FROM sessions WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM user_profiles WHERE id = $1', [testUserId]);
    await query('DELETE FROM auth_users WHERE id = $1', [testUserId]);
    assert('Cleanup database successful', true);
}

function cleanup() {
    if (serverProcess) {
        console.log('Stopping application server...');
        serverProcess.kill();
    }
}

run()
    .then(() => {
        cleanup();
        console.log('');
        console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
        console.log('');
        process.exit(FAIL.length > 0 ? 1 : 0);
    })
    .catch((err) => {
        cleanup();
        console.error('Unhandled error during smoke test:', err);
        process.exit(1);
    });
