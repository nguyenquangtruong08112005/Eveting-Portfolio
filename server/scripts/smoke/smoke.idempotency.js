#!/usr/bin/env node
/**
 * smoke.idempotency.js
 * Comprehensive Smoke test for Idempotency Engine
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
const idempotencyRepository = require('@/providers/database/idempotency.repository');
const idempotencyMiddleware = require('@/shared/middleware/idempotency.middleware');

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

    for (let i = 0; i < 40; i++) {
        if (serverStarted) break;
        try {
            const res = await axios.get(BASE_URL, { validateStatus: () => true });
            if (res.status < 500) {
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

    // 2. Setup Test Users & Event
    console.log('\n  [Setup Test Users & Event]');
    const prefix = `idem_smoke_${Date.now()}`;
    const email1 = `${prefix}_user1@test.com`;
    const email2 = `${prefix}_user2@test.com`;
    const password = 'Password123!';

    // Register User 1
    const regRes1 = await axios.post(`${BASE_URL}/auth/register`, { email: email1, password, name: 'User One' });
    const accessToken1 = regRes1.data.accessToken;
    const testUserId1 = regRes1.data.user.id;
    await query('UPDATE auth_users SET email_verified = true WHERE id = $1', [testUserId1]);
    assert('User 1 registered and logged in', !!accessToken1);

    // Register User 2
    const regRes2 = await axios.post(`${BASE_URL}/auth/register`, { email: email2, password, name: 'User Two' });
    const accessToken2 = regRes2.data.accessToken;
    const testUserId2 = regRes2.data.user.id;
    await query('UPDATE auth_users SET email_verified = true WHERE id = $1', [testUserId2]);
    assert('User 2 registered and logged in', !!accessToken2);

    // Create Event
    const testEventId = `evt_${prefix}_${uuidv4()}`;
    const now = Date.now();
    const eventData = {
        name: 'Idempotency Test Event',
        description: 'Test event description',
        date: now + 86400000,
        eventType: 'physical',
        organizerId: testUserId1,
        ticketTypes: {
            standard: { name: 'Standard', price: 50000, available: 20, total: 20 }
        },
        minPrice: 50000,
        status: 'active',
        visibility: 'public',
        createdAt: now,
        lastUpdatedAt: now
    };
    await eventRepository.createEvent(testEventId, eventData);
    assert('Test event created', true);

    try {
        // 3. Test Header Required
        console.log('\n  [Test Header Required]');
        try {
            await axios.post(`${BASE_URL}/tickets/book`, { eventId: testEventId, ticketType: 'standard', quantity: 1 }, {
                headers: { Authorization: `Bearer ${accessToken1}` }
            });
            assert('Missing header returns 400 Bad Request', false);
        } catch (err) {
            assert('Missing header returns 400 Bad Request', err.response && err.response.status === 400 && err.response.data.code === 'IDEMPOTENCY_KEY_REQUIRED');
        }

        // 4. Test Key Reordering & Exact Replay
        console.log('\n  [Test Key Reordering & Exact Replay]');
        const key1 = `key_${prefix}_1_${uuidv4()}`;
        const payloadOriginal = { eventId: testEventId, ticketType: 'standard', quantity: 1 };
        const payloadReordered = { quantity: 1, ticketType: 'standard', eventId: testEventId };

        // Initial Request
        const res1 = await axios.post(`${BASE_URL}/tickets/book`, payloadOriginal, {
            headers: { Authorization: `Bearer ${accessToken1}`, 'X-Idempotency-Key': key1 }
        });
        assert('Initial request succeeds (201)', res1.status === 201);
        const createdTicketId = res1.data.id;

        // Reordered Key Request (Should be Cache HIT)
        const resReordered = await axios.post(`${BASE_URL}/tickets/book`, payloadReordered, {
            headers: { Authorization: `Bearer ${accessToken1}`, 'X-Idempotency-Key': key1 }
        });
        assert('Reordered payload keys return cached response (201)', resReordered.status === 201);
        assert('Reordered payload returns X-Idempotency-Cache: HIT', resReordered.headers['x-idempotency-cache'] === 'HIT');
        assert('Reordered payload returns same ticket ID', resReordered.data.id === createdTicketId);

        // Exact Replay Request
        const resReplay = await axios.post(`${BASE_URL}/tickets/book`, payloadOriginal, {
            headers: { Authorization: `Bearer ${accessToken1}`, 'X-Idempotency-Key': key1 }
        });
        assert('Exact replay returns cached response (201)', resReplay.status === 201);
        assert('Exact replay returns X-Idempotency-Cache: HIT', resReplay.headers['x-idempotency-cache'] === 'HIT');
        assert('Exact replay returns same ticket ID', resReplay.data.id === createdTicketId);

        // 5. Test Payload Mismatch (422)
        console.log('\n  [Test Payload Mismatch (422)]');
        const payloadDifferent = { eventId: testEventId, ticketType: 'standard', quantity: 2 };
        try {
            await axios.post(`${BASE_URL}/tickets/book`, payloadDifferent, {
                headers: { Authorization: `Bearer ${accessToken1}`, 'X-Idempotency-Key': key1 }
            });
            assert('Different payload with same key returns 422', false);
        } catch (err) {
            assert('Different payload with same key returns 422', err.response && err.response.status === 422 && err.response.data.code === 'IDEMPOTENCY_KEY_REUSE_PAYLOAD_MISMATCH');
        }

        // 6. Test Concurrent Duplicate Requests (409)
        console.log('\n  [Test Concurrent Duplicate Requests (409)]');
        const keyConcurrent = `key_${prefix}_concurrent_${uuidv4()}`;
        const payloadConcurrent = { eventId: testEventId, ticketType: 'standard', quantity: 1 };

        const reqPromise1 = axios.post(`${BASE_URL}/tickets/book`, payloadConcurrent, {
            headers: { Authorization: `Bearer ${accessToken1}`, 'X-Idempotency-Key': keyConcurrent }
        });
        const reqPromise2 = axios.post(`${BASE_URL}/tickets/book`, payloadConcurrent, {
            headers: { Authorization: `Bearer ${accessToken1}`, 'X-Idempotency-Key': keyConcurrent }
        });

        const results = await Promise.allSettled([reqPromise1, reqPromise2]);
        let successCount = 0;
        let conflictCount = 0;

        for (const r of results) {
            if (r.status === 'fulfilled') {
                successCount++;
            } else if (r.reason.response && r.reason.response.status === 409) {
                conflictCount++;
                assert('Concurrent duplicate returns CONCURRENT_REQUEST_IN_PROGRESS', r.reason.response.data.code === 'CONCURRENT_REQUEST_IN_PROGRESS');
            }
        }
        assert('Concurrent requests result in 1 success and 1 conflict', successCount === 1 && conflictCount === 1);

        // 7. Test Cross-Principal / Cross-Route Collision Safety
        console.log('\n  [Test Cross-Principal / Cross-Route Collision Safety]');
        try {
            await axios.post(`${BASE_URL}/tickets/book`, payloadOriginal, {
                headers: { Authorization: `Bearer ${accessToken2}`, 'X-Idempotency-Key': key1 }
            });
            assert('Key owned by another user returns 409 Conflict', false);
        } catch (err) {
            assert('Key owned by another user returns 409 Conflict', err.response && err.response.status === 409 && err.response.data.code === 'IDEMPOTENCY_KEY_OWNED_BY_OTHER');
        }

        // 8. Test 5xx Error Key Cleanup (Deterministic Unit-Style Middleware Check)
        console.log('\n  [Test 5xx Error Key Cleanup]');
        const middleware = idempotencyMiddleware({ required: true });

        const key5xx = `key_${prefix}_5xx_${uuidv4()}`;
        const mockEndpoint = '/api/unit-500-release-test';
        const mockPayload = { testData: 'unit_500_retry' };

        // Step 8a: Downstream handler sends 500
        const mockReq1 = {
            method: 'POST',
            user: { uid: testUserId1 },
            headers: { 'x-idempotency-key': key5xx },
            originalUrl: mockEndpoint,
            body: mockPayload
        };

        let nextCalled1 = false;
        let resolveRes1;
        const res1Promise = new Promise((resolve) => { resolveRes1 = resolve; });

        const mockRes1 = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(data) {
                resolveRes1(data);
                return this;
            },
            send(data) {
                resolveRes1(data);
                return this;
            }
        };

        await middleware(mockReq1, mockRes1, async () => {
            nextCalled1 = true;
            mockRes1.statusCode = 500;
            await mockRes1.json({ error: 'Internal Server Error' });
        });

        await res1Promise;
        assert('Downstream handler called on 500 error attempt', nextCalled1);

        const keyAfter500 = await idempotencyRepository.getByKey(key5xx);
        assert('Exact scoped key is released on 500 error', keyAfter500 === null);

        // Step 8b: Next valid attempt with same key acquires lock and succeeds
        const mockReq2 = {
            method: 'POST',
            user: { uid: testUserId1 },
            headers: { 'x-idempotency-key': key5xx },
            originalUrl: mockEndpoint,
            body: mockPayload
        };

        let nextCalled2 = false;
        let resolveRes2;
        const res2Promise = new Promise((resolve) => { resolveRes2 = resolve; });

        const mockRes2 = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(data) {
                resolveRes2(data);
                return this;
            },
            send(data) {
                resolveRes2(data);
                return this;
            }
        };

        await middleware(mockReq2, mockRes2, async () => {
            nextCalled2 = true;
            mockRes2.statusCode = 200;
            await mockRes2.json({ success: true, message: 'Recovered after 500' });
        });

        await res2Promise;
        assert('Next valid attempt with released key acquires lock', nextCalled2);

        const keyAfterRecovery = await idempotencyRepository.getByKey(key5xx);
        assert('Recovery request completes and caches 200 response', keyAfterRecovery !== null && keyAfterRecovery.status === 'COMPLETED' && keyAfterRecovery.responseCode === 200);

    } finally {
        // 9. Cleanup Uniquely Prefixed Data
        console.log('\n  [Cleanup]');
        try {
            await query('DELETE FROM idempotency_keys WHERE key LIKE $1', [`%${prefix}%`]);

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
            await query('DELETE FROM auth_tokens WHERE email LIKE $1', [`%${prefix}%`]);
            await query('DELETE FROM sessions WHERE user_id IN ($1, $2)', [testUserId1, testUserId2]);
            await query('DELETE FROM user_profiles WHERE id IN ($1, $2)', [testUserId1, testUserId2]);
            await query('DELETE FROM auth_users WHERE id IN ($1, $2)', [testUserId1, testUserId2]);
            assert('Cleanup database successful', true);
        } catch (cleanupErr) {
            console.error('Error during database cleanup:', cleanupErr.message);
        }
    }
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
