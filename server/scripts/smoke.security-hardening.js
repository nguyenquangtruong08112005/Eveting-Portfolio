#!/usr/bin/env node
/**
 * smoke.security-hardening.js
 * Smoke test for Phase P1.11 Security, Ticket Safety, and Compliance
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

const { spawn } = require('child_process');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const eventRepository = require('@/providers/database/event.repository');
const ticketRepository = require('@/providers/database/ticket.repository');

const TEST_PORT = process.env.TEST_PORT || '35439';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_TICKET_SECRET = process.env.JWT_TICKET_SECRET || 'smoke_test_jwt_ticket_secret_value_at_least_256_bits';
const ACCESS_TOKEN_SECRET = 'idempotency_smoke_test_access_token_secret_value_at_least_256_bits';

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
    console.log('smoke.security-hardening.js');
    console.log('───────────────────────────');

    // 1. Spawn Server
    console.log('Spawning application server...');
    const env = {
        ...process.env,
        PORT: TEST_PORT,
        DATABASE_URL,
        AUTH_PROVIDER: 'backend',
        ACCESS_TOKEN_SECRET,
        JWT_TICKET_SECRET,
        DATABASE_PROVIDER: 'postgres',
        QR_CODE_TTL: '10m', // set short TTL for test
    };
    serverProcess = spawn('node', ['src/server.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });

    let serverStarted = false;
    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        process.stdout.write('[Server] ' + output);
        if (output.includes('Server address') || output.includes('localhost:')) {
            serverStarted = true;
        }
    });
    
    serverProcess.stderr.on('data', (data) => {
        process.stderr.write('[Server ERROR] ' + data.toString());
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
    const email = `security_test_${Date.now()}@test.com`;
    const password = 'Password123!';
    const name = 'Security User';

    // Register User
    const regRes = await axios.post(`${BASE_URL}/auth/register`, { email, password, name });
    const accessToken = regRes.data.accessToken;
    const testUserId = regRes.data.user.id;
    assert('Test user registered and logged in', !!accessToken);

    // Register Organizer
    const orgRegRes = await axios.post(`${BASE_URL}/organizer/register`, {
        organizationName: 'Security Testing Org',
        contactEmail: email,
        phoneNumber: '0123456789'
    }, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert('User registered as organizer', orgRegRes.status === 200);

    // Login again to obtain organizer role claims
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
    const organizerToken = loginRes.data.accessToken;
    assert('Logged in again to acquire organizer role claims', !!organizerToken);

    // Create Event
    const testEventId = `evt_sec_${uuidv4()}`;
    const now = Date.now();
    await eventRepository.createEvent(testEventId, {
        name: 'Security Test Event',
        description: 'Security testing event description',
        date: now,
        eventType: 'physical',
        organizerId: testUserId, // make user owner of event
        ticketTypes: {
            standard: { name: 'Standard', price: 100000, available: 10, total: 10 }
        },
        minPrice: 100000,
        status: 'active',
        visibility: 'public',
        createdAt: now,
        lastUpdatedAt: now,
    });
    assert('Test event created', true);

    // 3. Book a Ticket (Audited)
    console.log('\n  [Book Ticket & Audit Log Verification]');
    const bookRes = await axios.post(`${BASE_URL}/tickets/book`, {
        eventId: testEventId,
        ticketType: 'standard',
        quantity: 1
    }, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert('Ticket booked successfully', bookRes.status === 201);
    const bookedTicketId = bookRes.data.id;

    // Verify Audit Log for booking was written
    const bookingLogs = (await query("SELECT * FROM audit_logs WHERE action = 'ticket:book' AND resource_id = $1", [bookedTicketId])).rows;
    assert('Audit log entry for ticket:book was created', bookingLogs.length === 1);
    if (bookingLogs.length === 1) {
        assert('Audit log actor matches user ID', bookingLogs[0].user_id === testUserId);
        assert('Audit log resource type is "ticket"', bookingLogs[0].resource_type === 'ticket');
    }

    // 4. Retrieve Ticket (Dynamic QR Verification)
    console.log('\n  [Retrieve Ticket - Dynamic QR Code Checks]');
    const ticketDetailsRes = await axios.get(`${BASE_URL}/tickets/${bookedTicketId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert('Retrieved ticket details successfully', ticketDetailsRes.status === 200);
    const dynamicQr = ticketDetailsRes.data.ticket.qrCode;
    assert('Retrieved qrCode is present', !!dynamicQr);

    // Decode and verify the dynamic QR code is a JWT containing expiration
    let decoded = null;
    try {
        decoded = jwt.verify(dynamicQr, JWT_TICKET_SECRET);
        assert('Dynamic QR is a valid JWT signed with JWT_TICKET_SECRET', true);
        assert('Dynamic QR contains exp (expiration) claim', typeof decoded.exp === 'number');
        assert('Dynamic QR contains ticketId matching booked ticket', decoded.ticketId === bookedTicketId);
    } catch (e) {
        assert(`Dynamic QR validation failed: ${e.message}`, false);
    }

    // 5. Check-in Verification (Successful Check-in)
    console.log('\n  [Verify Successful Check-in]');
    // First confirm payment so it's check-in eligible
    await ticketRepository.updateTicket(bookedTicketId, { status: 'paid' });

    const checkInRes = await axios.post(`${BASE_URL}/organizer/check-in-qr`, {
        qrToken: dynamicQr
    }, {
        headers: { Authorization: `Bearer ${organizerToken}` }
    });
    assert('Check-in with dynamic QR code returned status 200', checkInRes.status === 200);
    assert('Check-in message matches success', checkInRes.data.valid === true && checkInRes.data.message === 'Check-in thành công');

    // Verify check-in audit log was written
    await sleep(300);
    const checkInLogs = (await query("SELECT * FROM audit_logs WHERE action = 'ticket:check-in' AND resource_id = $1", [dynamicQr])).rows;
    assert('Audit log entry for ticket:check-in was created', checkInLogs.length === 1);
    if (checkInLogs.length === 1) {
        assert('Check-in audit log actor matches organizer user ID', checkInLogs[0].user_id === testUserId);
    }

    // 6. Check-in Verification (Legacy QR Code compatibility)
    console.log('\n  [Verify Legacy QR Code compatibility]');
    // Setup a new ticket
    const legacyTicketId = `tkt_leg_${uuidv4()}`;
    await query(
        `INSERT INTO tickets (id, event_id, user_id, organizer_id, type, price, original_price, quantity, unit_price, status, purchase_date, qr_code)
         VALUES ($1, $2, $3, $4, 'standard', 100000, 100000, 1, 100000, 'paid', $5, 'legacy_mock_token')`,
        [legacyTicketId, testEventId, testUserId, testUserId, now]
    );

    // Generate static legacy JWT (no expiration claim)
    const legacyQrPayload = {
        ticketId: legacyTicketId,
        userId: testUserId,
        eventId: testEventId,
        quantity: 1
    };
    const legacyQrToken = jwt.sign(legacyQrPayload, JWT_TICKET_SECRET); // unsigned option defaults to no expiry

    const legacyCheckInRes = await axios.post(`${BASE_URL}/organizer/check-in-qr`, {
        qrToken: legacyQrToken
    }, {
        headers: { Authorization: `Bearer ${organizerToken}` }
    });
    assert('Check-in with legacy (non-expiring) QR code succeeded', legacyCheckInRes.status === 200 && legacyCheckInRes.data.valid === true);

    // 7. Check-in Verification (Expired QR Code safety check)
    console.log('\n  [Verify Expired QR Code failure]');
    const expiredTicketId = `tkt_exp_${uuidv4()}`;
    await query(
        `INSERT INTO tickets (id, event_id, user_id, organizer_id, type, price, original_price, quantity, unit_price, status, purchase_date, qr_code)
         VALUES ($1, $2, $3, $4, 'standard', 100000, 100000, 1, 100000, 'paid', $5, 'expired_mock_token')`,
        [expiredTicketId, testEventId, testUserId, testUserId, now]
    );

    // Generate expired JWT (signed with negative expiry)
    const expiredQrPayload = {
        ticketId: expiredTicketId,
        userId: testUserId,
        eventId: testEventId,
        quantity: 1
    };
    const expiredQrToken = jwt.sign(expiredQrPayload, JWT_TICKET_SECRET, { expiresIn: '-10s' });

    try {
        await axios.post(`${BASE_URL}/organizer/check-in-qr`, {
            qrToken: expiredQrToken
        }, {
            headers: { Authorization: `Bearer ${organizerToken}` }
        });
        assert('Check-in with expired QR code should fail but succeeded', false);
    } catch (error) {
        assert('Check-in with expired QR code failed with status 400 (INVALID_TICKET)', error.response.status === 400);
        assert('Check-in response error matches INVALID_TICKET', error.response.data.error === 'INVALID_TICKET');
    }

    // 8. Test Rate Limiter (Trigger 429)
    console.log('\n  [Verify Rate Limiter]');
    let rateLimited = false;
    // Send multiple fast requests to /auth/login to trigger rate limit (max 10)
    for (let j = 0; j < 15; j++) {
        try {
            await axios.post(`${BASE_URL}/auth/login`, {
                email: 'abuse_test@test.com',
                password: 'wrong_password'
            });
        } catch (error) {
            if (error.response && error.response.status === 429) {
                rateLimited = true;
                break;
            }
        }
        await sleep(50); // fast loop
    }
    assert('Excessive auth requests triggered 429 Too Many Requests', rateLimited);

    // Cleanup DB
    console.log('\n  [Cleanup DB]');
    await query('DELETE FROM audit_logs WHERE user_id = $1 OR user_id = \'system\'', [testUserId]);
    await query('DELETE FROM tickets WHERE event_id = $1', [testEventId]);
    await query('DELETE FROM events WHERE id = $1', [testEventId]);
    await query('DELETE FROM organizer_profiles WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM auth_users WHERE id = $1', [testUserId]);
    assert('DB cleaned up', true);

    // Stop Server
    serverProcess.kill();
    console.log('Server stopped.');

    console.log('');
    console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
    console.log('');

    process.exit(FAIL.length > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unhandled test failure:', err);
    if (serverProcess) serverProcess.kill();
    process.exit(1);
});
