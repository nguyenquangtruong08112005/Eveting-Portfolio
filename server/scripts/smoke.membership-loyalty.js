#!/usr/bin/env node
/**
 * smoke.membership-loyalty.js
 *
 * Validates Phase P1.8-S3: Membership Foundation
 *  1. Default membership info retrieval (auto-initializes as Standard).
 *  2. Points earning upon payment confirmation (1 pt / 10,000 VND).
 *  3. Automatic membership upgrade to Silver when user reaches 100 points.
 *  4. Silver tier 2% automatic discount applied to booking.
 *  5. BFF Endpoint GET /api/web/memberships/me validation.
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
process.env.PROMOTION_DATABASE_PROVIDER = 'postgres';
process.env.MEMBERSHIP_DATABASE_PROVIDER = 'postgres';

require('./../src/alias-bootstrap');

const { spawn } = require('child_process');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const ticketService = require('@/modules/tickets/application/service');
const eventRepository = require('@/providers/database/event.repository');
const membershipRepository = require('@/providers/database/membership.repository');

const TEST_PORT = process.env.TEST_PORT || '38999';
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
    console.log('smoke.membership-loyalty.js');
    console.log('────────────────────────────────');

    const testUserId = `usr_memb_${uuidv4()}`;
    const testOrganizerId = `org_memb_${uuidv4()}`;
    const testEventId = `evt_memb_${uuidv4()}`;
    const testUserEmail = `memb_${uuidv4().substring(0,8)}@test.com`;
    const now = Date.now();

    console.log('\n  [Setup Test DB Data]');

    // 1. Insert test user in DB
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'Membership Test User', 'mock_hash', $3, true)`,
        [testUserId, testUserEmail, ['user']]
    );

    // 2. Insert test event (VND 100,000 ticket price)
    const ticketTypes = {
        standard: { name: 'Standard', price: 100000, available: 50, total: 50 },
    };
    await eventRepository.createEvent(testEventId, {
        name: 'Membership Test Event',
        description: 'Testing membership discounts and point earning',
        date: now,
        eventType: 'physical',
        organizerId: testOrganizerId,
        ticketTypes: ticketTypes,
        minPrice: 100000,
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
        // --- Test 1: Check Default Membership ---
        console.log('\n  [Test 1: Default Membership Initialization]');
        const initialRes = await axios.get(`${BASE_URL}/api/web/memberships/me`, authHeaders);
        assert('BFF returns 200 OK', initialRes.status === 200);
        assert('Initial tier is Standard', initialRes.data.tierName === 'standard');
        assert('Initial discount percentage is 0%', initialRes.data.discountPercentage === 0);
        assert('Initial points balance is 0', initialRes.data.pointsBalance === 0);
        assert('Initial points ledger is empty', initialRes.data.ledger.length === 0);

        // --- Test 2: Standard Ticket Booking (Full Price) ---
        console.log('\n  [Test 2: Standard Ticket Booking (Full Price)]');
        const tkt1 = await ticketService.bookTicket(testUserId, testEventId, 'standard', 1);
        assert('Ticket price is 100k (no discount)', tkt1.price === 100000);
        assert('Ticket originalPrice is 100k', tkt1.originalPrice === 100000);

        // --- Test 3: Payment Confirmation & Point Accrual ---
        console.log('\n  [Test 3: Confirm Payment & Accrual]');
        const confirmedTkt1 = await ticketService.confirmTicketPayment(tkt1.id);
        assert('Ticket status changed to paid', confirmedTkt1.status === 'paid');

        const midRes = await axios.get(`${BASE_URL}/api/web/memberships/me`, authHeaders);
        assert('Earned 10 points (1 point per 10k VND spent)', midRes.data.pointsBalance === 10);
        assert('Points ledger contains 1 entry', midRes.data.ledger.length === 1);
        assert('Ledger entry type is ticket_purchase', midRes.data.ledger[0].transactionType === 'ticket_purchase');
        assert('Ledger entry references ticketId', midRes.data.ledger[0].referenceId === tkt1.id);

        // --- Test 4: Points accumulation & Auto Upgrade ---
        console.log('\n  [Test 4: Auto Tier Upgrade Threshold Check]');
        // Book 10 standard tickets (VND 1,000,000) to cross the Silver threshold (100 points required)
        const tkt2 = await ticketService.bookTicket(testUserId, testEventId, 'standard', 10);
        assert('Booked 10 tickets for 1M VND subtotal', tkt2.originalPrice === 1000000);

        // Confirm payment
        await ticketService.confirmTicketPayment(tkt2.id);

        const upgradedRes = await axios.get(`${BASE_URL}/api/web/memberships/me`, authHeaders);
        assert('Points balance increased by 100 to 110', upgradedRes.data.pointsBalance === 110);
        assert('Tier upgraded to silver', upgradedRes.data.tierName === 'silver');
        assert('Silver tier provides 2% flat discount', upgradedRes.data.discountPercentage === 0.02);

        // --- Test 5: Silver Tier Discount Application ---
        console.log('\n  [Test 5: Discount Application at Silver Tier]');
        const tktSilver = await ticketService.bookTicket(testUserId, testEventId, 'standard', 1);
        assert('Ticket price incorporates 2% discount (98k)', tktSilver.price === 98000);
        assert('Ticket originalPrice remains 100k', tktSilver.originalPrice === 100000);
        assert('Ticket raw_data stores membershipDiscountAmount (2000)', tktSilver.membershipDiscountAmount === 2000);
        assert('Ticket raw_data stores membershipDiscountRate (0.02)', tktSilver.membershipDiscountRate === 0.02);

    } catch (err) {
        console.error('Test execution failed:', err.message);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
        FAIL.push('Exception in tests');
    } finally {
        console.log('\n  [Tear Down Server & Clean DB]');
        serverProcess.kill();
        await query('DELETE FROM tickets WHERE user_id = $1', [testUserId]);
        await query('DELETE FROM loyalty_points_ledger WHERE user_id = $1', [testUserId]);
        await query('DELETE FROM user_memberships WHERE user_id = $1', [testUserId]);
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
