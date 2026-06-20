#!/usr/bin/env node
/**
 * smoke.reviews-eligibility.js
 *
 * Validates Phase P1.9-S1: Review Eligibility
 *  1. Post review with no ticket (should return 403 Forbidden).
 *  2. Post review with pending ticket (should return 403 Forbidden).
 *  3. Post review with paid ticket (should return 201 Created).
 *  4. Post review with checkedIn ticket (should return 201 Created).
 *  5. Post review with cancelled/failed ticket (should return 403 Forbidden).
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
process.env.REVIEW_DATABASE_PROVIDER = 'postgres';

require('./../src/alias-bootstrap');

const { spawn } = require('child_process');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const ticketService = require('@/modules/tickets/application/service');
const eventRepository = require('@/providers/database/event.repository');

const TEST_PORT = process.env.TEST_PORT || '39888';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const JWT_SECRET = 'super_secret_key_at_least_256_bits_for_backend_auth_smoke_testing_1234567890';

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
    console.log('smoke.reviews-eligibility.js');
    console.log('────────────────────────────');

    const testUserId = `usr_rev_${uuidv4()}`;
    const testOrganizerId = `org_rev_${uuidv4()}`;
    const testEventId = `evt_rev_${uuidv4()}`;
    const testUserEmail = `rev_${uuidv4().substring(0,8)}@test.com`;
    const now = Date.now();

    console.log('\n  [Setup Test DB Data]');

    // 1. Insert test user in DB
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'Review Test User', 'mock_hash', $3, true)`,
        [testUserId, testUserEmail, ['user']]
    );

    // 2. Insert test event
    const ticketTypes = {
        standard: { name: 'Standard', price: 50000, available: 10, total: 10 },
    };
    await eventRepository.createEvent(testEventId, {
        name: 'Review Test Event',
        description: 'Testing review eligibility constraints',
        date: now,
        eventType: 'physical',
        organizerId: testOrganizerId,
        ticketTypes: ticketTypes,
        minPrice: 50000,
        status: 'active',
        visibility: 'public',
        createdAt: now,
        lastUpdatedAt: now,
    });

    // 3. Spawning application server
    console.log('\n  [Spawning Application Server]');
    const env = {
        ...process.env,
        PORT: TEST_PORT,
        AUTH_PROVIDER: 'backend',
        ACCESS_TOKEN_SECRET: JWT_SECRET,
    };
    const serverProcess = spawn('node', ['src/server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

    let serverStarted = false;
    serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('Server address') || data.toString().includes('localhost:')) {
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
        } catch (err) {}
        await sleep(500);
    }

    if (!serverStarted) {
        throw new Error('Server failed to start or did not become responsive.');
    }
    console.log('  Server is responsive at:', BASE_URL);

    // 4. Generate Auth Token
    const token = jwt.sign({ uid: testUserId, email: testUserEmail, roles: ['user'] }, JWT_SECRET);
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    try {
        // --- Test 1: No Ticket Review Attempt ---
        console.log('\n  [Test 1: Review without ticket]');
        let err1 = null;
        try {
            await axios.post(`${BASE_URL}/api/web/events/${testEventId}/reviews`, { rating: 5, comment: 'Nice!' }, authHeaders);
        } catch (err) {
            err1 = err.response;
        }
        assert('Attempt returns 403 Forbidden', err1 && err1.status === 403);
        assert('Error message contains ticket check', err1 && err1.data.error.includes('attend the event to review'));

        // --- Test 2: Pending Ticket Review Attempt ---
        console.log('\n  [Test 2: Review with pending ticket]');
        const ticket = await ticketService.bookTicket(testUserId, testEventId, 'standard', 1);
        assert('Ticket booked successfully with pending status', ticket.status === 'pending');

        let err2 = null;
        try {
            await axios.post(`${BASE_URL}/api/web/events/${testEventId}/reviews`, { rating: 4, comment: 'Good!' }, authHeaders);
        } catch (err) {
            err2 = err.response;
        }
        assert('Attempt with pending ticket returns 403 Forbidden', err2 && err2.status === 403);

        // --- Test 3: Paid Ticket Review Attempt ---
        console.log('\n  [Test 3: Review with paid ticket]');
        await ticketService.confirmTicketPayment(ticket.id);

        const resPaid = await axios.post(`${BASE_URL}/api/web/events/${testEventId}/reviews`, { rating: 5, comment: 'Awesome!' }, authHeaders);
        assert('Attempt with paid ticket succeeds with 201 Created', resPaid.status === 201);
        assert('Returned review has correct rating', resPaid.data.rating === 5);

        // --- Test 4: Checked-In Ticket Review Attempt ---
        console.log('\n  [Test 4: Review with checked-in ticket]');
        // Update ticket status to checkedIn manually for verification
        await query("UPDATE tickets SET status = 'checkedIn' WHERE id = $1", [ticket.id]);

        const resCheckedIn = await axios.post(`${BASE_URL}/api/web/events/${testEventId}/reviews`, { rating: 4, comment: 'Superb!' }, authHeaders);
        assert('Attempt with checkedIn ticket succeeds with 201 Created', resCheckedIn.status === 201);

        // --- Test 5: Cancelled/Failed Ticket Review Attempt ---
        console.log('\n  [Test 5: Review with cancelled/failed ticket]');
        // Update ticket status to cancelled manually for verification
        await query("UPDATE tickets SET status = 'cancelled' WHERE id = $1", [ticket.id]);

        let err5 = null;
        try {
            await axios.post(`${BASE_URL}/api/web/events/${testEventId}/reviews`, { rating: 3, comment: 'Okay' }, authHeaders);
        } catch (err) {
            err5 = err.response;
        }
        assert('Attempt with cancelled ticket returns 403 Forbidden', err5 && err5.status === 403);

    } catch (err) {
        console.error('Test execution failed:', err.message);
        FAIL.push('Exception in tests');
    } finally {
        console.log('\n  [Tear Down Server & Clean DB]');
        serverProcess.kill();
        await query('DELETE FROM reviews WHERE event_id = $1', [testEventId]);
        await query('DELETE FROM tickets WHERE user_id = $1', [testUserId]);
        await query('DELETE FROM auth_users WHERE id = $1', [testUserId]);
        await query('DELETE FROM events WHERE id = $1', [testEventId]);
    }

    console.log('');
    console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
    console.log('');

    process.exit(FAIL.length > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unhandled error running smoke test:', err);
    process.exit(1);
});
