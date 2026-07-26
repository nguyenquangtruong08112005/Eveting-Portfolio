#!/usr/bin/env node
/**
 * smoke.concurrent-booking.js
 * Verification check for transaction safety, row locking, and overselling prevention.
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

const TEST_PORT = process.env.TEST_PORT || '35434';
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
    console.log('smoke.concurrent-booking.js');
    console.log('───────────────────────────');

    // 1. Spawn Server
    console.log('Spawning application server...');
    const env = {
        ...process.env,
        PORT: TEST_PORT,
        DATABASE_URL,
        AUTH_PROVIDER: 'backend',
        ACCESS_TOKEN_SECRET: 'concurrency_smoke_test_access_token_secret_value_at_least_256_bits',
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

    // 2. Create Event with limited capacity (only 3 standard tickets available)
    console.log('\n  [Setup Event with 3 Capacity]');
    const testOrganizerId = `usr_org_${uuidv4()}`;
    const testEventId = `evt_conc_${uuidv4()}`;
    const now = Date.now();
    const authRepository = require('@/providers/database/postgres.auth.repository');
    await authRepository.createUser({
        id: testOrganizerId,
        email: `org_${uuidv4()}@test.com`,
        name: 'Organizer User',
        passwordHash: 'dummy_hash',
        roles: ['organizer']
    });
    const eventData = {
        name: 'Concurrency Test Event',
        description: 'Only 3 tickets available!',
        date: now + 86400000,
        eventType: 'physical',
        organizerId: testOrganizerId,
        ticketTypes: {
            standard: { name: 'Standard', price: 10000, available: 3, total: 3 }
        },
        minPrice: 10000,
        status: 'active',
        visibility: 'public',
        createdAt: now,
        lastUpdatedAt: now
    };
    await eventRepository.createEvent(testEventId, eventData);
    assert('Test event created with available tickets = 3', true);

    // 3. Register 10 distinct users and login
    console.log('\n  [Registering 10 concurrent users...]');
    const users = [];
    for (let i = 0; i < 10; i++) {
        const email = `conc_user_${i}_${Date.now()}@test.com`;
        const password = 'Password123!';
        const name = `Concurrent User ${i}`;

        const regRes = await axios.post(`${BASE_URL}/auth/register`, { email, password, name });
        await query('UPDATE auth_users SET email_verified = true WHERE id = $1', [regRes.data.user.id]);
        users.push({
            id: regRes.data.user.id,
            email: email,
            accessToken: regRes.data.accessToken
        });
    }
    assert('Successfully registered 10 test users', users.length === 10);

    // 4. Send 10 concurrent requests using Promise.all
    console.log('\n  [Sending 10 concurrent booking requests...]');
    const bookPayload = { eventId: testEventId, ticketType: 'standard', quantity: 1 };
    
    const promises = users.map((user, idx) => {
        // Add a unique idempotency key for each user to test concurrency independently of the duplicate request checks
        const idempotencyKey = `idem_user_${idx}_${testEventId}`;
        return axios.post(`${BASE_URL}/tickets/book`, bookPayload, {
            headers: {
                Authorization: `Bearer ${user.accessToken}`,
                'X-Idempotency-Key': idempotencyKey
            }
        });
    });

    const results = await Promise.allSettled(promises);

    let successCount = 0;
    let conflictCount = 0;
    let otherCount = 0;

    for (const r of results) {
        if (r.status === 'fulfilled') {
            successCount++;
        } else {
            const err = r.reason;
            if (err.response && err.response.status === 409) {
                conflictCount++;
                const msg = err.response.data.message || (err.response.data.error && err.response.data.error.message) || '';
                assert('Booking request rejected with 409 Conflict (Cap limit)', msg.includes('Not enough tickets available'));
            } else {
                otherCount++;
                console.error('Unexpected error response:', err.response ? err.response.data : err.message);
            }
        }
    }

    console.log('\n  [Results Validation]');
    assert('Exactly 3 bookings succeeded', successCount === 3);
    assert('Exactly 7 bookings were rejected with 409 Conflict', conflictCount === 7);
    assert('0 other errors occurred', otherCount === 0);

    // Verify DB availability is exactly 0
    const ev = await eventRepository.getEventById(testEventId);
    assert('Final ticket availability is exactly 0 in DB', ev.ticketTypes.standard.available === 0);

    // Verify exactly 3 tickets created
    const ticketCountRes = await query('SELECT COUNT(*)::int as count FROM tickets WHERE event_id = $1', [testEventId]);
    assert('Exactly 3 tickets exist in database', ticketCountRes.rows[0].count === 3);

    // 5. Cleanup
    console.log('\n  [Cleanup]');
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
    
    for (const u of users) {
        await query('DELETE FROM idempotency_keys WHERE key = $1', [`idem_user_${users.indexOf(u)}_${testEventId}`]);
        await query('DELETE FROM auth_tokens WHERE email = $1', [u.email]);
        await query('DELETE FROM sessions WHERE user_id = $1', [u.id]);
        await query('DELETE FROM user_profiles WHERE id = $1', [u.id]);
        await query('DELETE FROM auth_users WHERE id = $1', [u.id]);
    }
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
        console.error('Unhandled error during concurrent booking smoke test:', err);
        process.exit(1);
    });
