#!/usr/bin/env node
/**
 * smoke.zalopay-callback-idempotency.js
 *
 * Validates ZaloPay payment callback idempotency & state machine:
 *  1. Check first success callback transitions attempt -> succeeded.
 *  2. Check duplicate callback returns early and does not recreate ledger entries.
 *  3. Check concurrent callbacks serialize correctly using SQL FOR UPDATE row locks.
 *  4. Check concurrent check-status and callback race serialised by FOR UPDATE.
 *  5. Check manual check reporting failure transitions attempt -> failed.
 *  6. Check terminal states (succeeded, failed) are guarded against overwritten updates.
 *  7. Webhook callback rejected on terminal (failed) attempt.
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
const crypto = require('crypto');
const app = require('../../src/app');
const { query } = require('@/providers/database/postgres.client');
const eventRepository = require('@/providers/database/event.repository');
const ticketRepository = require('@/providers/database/ticket.repository');
const orderRepository = require('@/providers/database/order.repository');
const { PAYMENT_STATUS } = require('@/modules/orders/domain/order-status');
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
    console.log('smoke.zalopay-callback-idempotency.js');
    console.log('──────────────────────────────────────');

    const PORT = 3002;
    const server = http.createServer(app);

    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`  [Server] Listening on port ${PORT}`);

    const client = axios.create({ baseURL: `http://localhost:${PORT}` });
    const key2 = process.env.ZALOPAY_KEY2 || 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf';

    const testUserId = `usr_pay_${uuidv4()}`;
    const testUserEmail = `pay_${uuidv4()}@test.com`;
    const testEventId = `evt_pay_${uuidv4()}`;
    const testTicketId = `tkt_pay_${uuidv4()}`;
    const testOrderId = `ord_pay_${uuidv4()}`;
    const testOrderItemId = `oi_pay_${uuidv4()}`;
    const testPaymentAttemptId = `pa_pay_${uuidv4()}`;
    const zaloAppTransId = `${new Date().toISOString().slice(2,10).replace(/-/g,'')}_${testTicketId.slice(-10)}_${Math.floor(Math.random()*100000)}`;

    const now = Date.now();

    console.log('\n  [Setup DB Data]');

    await query(
        `INSERT INTO auth_users (id, email, password_hash, roles, is_active)
         VALUES ($1, $2, 'mock_hash', $3, true)`,
        [testUserId, testUserEmail, ['user']]
    );

    const testUserToken = signAccessToken({ uid: testUserId, email: testUserEmail, roles: ['user'] });

    // 2. Create event
    const ticketTypes = {
        standard: { name: 'Standard', price: 150000, available: 10, total: 10 },
    };
    await eventRepository.createEvent(testEventId, {
        name: 'Idempotency Test Event',
        description: 'Payment testing description',
        date: now,
        eventType: 'physical',
        organizerId: testUserId,
        ticketTypes: ticketTypes,
        minPrice: 150000,
        status: 'active',
        visibility: 'public',
        createdAt: now,
        lastUpdatedAt: now,
    });

    // 3. Create ticket
    const ticketData = {
        id: testTicketId,
        eventId: testEventId,
        userId: testUserId,
        organizerId: testUserId,
        type: 'standard',
        price: 150000,
        originalPrice: 150000,
        quantity: 1,
        unitPrice: 150000,
        status: 'pending',
        purchaseDate: now,
    };
    await ticketRepository.createTicket(testTicketId, ticketData);

    // 4. Create shadow order
    await orderRepository.createOrder({
        id: testOrderId,
        userId: testUserId,
        eventId: testEventId,
        organizerId: ticketData.organizerId,
        status: 'pending_payment',
        subtotalAmount: 150000,
        discountAmount: 0,
        feeAmount: 0,
        totalAmount: 150000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
        items: [{
            id: testOrderItemId,
            ticketId: testTicketId,
            quantity: 1,
            unitPrice: 150000,
            subtotal: 150000,
            totalAmount: 150000,
            status: 'pending',
            createdAt: now,
        }],
    });

    // 5. Create payment attempt
    await orderRepository.createPaymentAttempt({
        id: testPaymentAttemptId,
        orderId: testOrderId,
        ticketId: testTicketId,
        status: 'pending',
        paymentMethod: 'zalopay',
        provider: 'zalopay',
        providerOrderId: zaloAppTransId,
        amount: 150000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
    });

    // Link ticket to order
    await orderRepository.linkTicketToOrder(testTicketId, testOrderId, testOrderItemId, testPaymentAttemptId);

    assert('test user, event, ticket, order, and payment attempt setup', true);

    // --- CASE 1: Valid ZaloPay Webhook Callback ---
    console.log('\n  [Case 1: Sending Valid ZaloPay Webhook Callback]');
    const callbackDataStr = JSON.stringify({
        app_id: 2554,
        app_trans_id: zaloAppTransId,
        zp_trans_id: 'zp_trans_111',
        amount: 150000,
        embed_data: JSON.stringify({ ticket_id: testTicketId })
    });
    const mac = crypto.createHmac('sha256', key2).update(callbackDataStr).digest('hex');

    const callbackResponse = await client.post('/payments/callback', {
        data: callbackDataStr,
        mac: mac
    });

    assert('First callback: status 200', callbackResponse.status === 200);
    assert('First callback: return_code = 1', callbackResponse.data.return_code === 1);

    // Verify DB states
    const ticketCase1 = await ticketRepository.getTicketById(testTicketId);
    assert('Ticket status is paid', ticketCase1.status === 'paid');

    const attemptCase1 = (await query('SELECT status FROM payment_attempts WHERE id = $1', [testPaymentAttemptId])).rows[0];
    assert('Payment attempt status is succeeded', attemptCase1.status === 'succeeded');

    const ledgerCountCase1 = (await query('SELECT COUNT(*) FROM ledger_entries WHERE order_id = $1', [testOrderId])).rows[0].count;
    assert('Ledger entry created (count = 1)', Number(ledgerCountCase1) === 1);

    // --- CASE 2: Duplicate Callback (Idempotency check) ---
    console.log('\n  [Case 2: Sending Duplicate Callback]');
    const duplicateResponse = await client.post('/payments/callback', {
        data: callbackDataStr,
        mac: mac
    });

    assert('Duplicate callback: status 200', duplicateResponse.status === 200);
    assert('Duplicate callback: return_code = 1', duplicateResponse.data.return_code === 1);
    assert('Duplicate callback: message = "success"', duplicateResponse.data.return_message === 'success');

    // Make sure ledger entry is still 1
    const ledgerCountCase2 = (await query('SELECT COUNT(*) FROM ledger_entries WHERE order_id = $1', [testOrderId])).rows[0].count;
    assert('Ledger entry was NOT duplicated (count = 1)', Number(ledgerCountCase2) === 1);

    // --- CASE 3: Concurrent Callback Requests (Race condition check) ---
    console.log('\n  [Case 3: Simulating Concurrent Callbacks]');
    // We create another ticket and attempt to test concurrency
    const testTicketId2 = `tkt_pay_${uuidv4()}`;
    const testOrderId2 = `ord_pay_${uuidv4()}`;
    const testOrderItemId2 = `oi_pay_${uuidv4()}`;
    const testPaymentAttemptId2 = `pa_pay_${uuidv4()}`;
    const zaloAppTransId2 = `${new Date().toISOString().slice(2,10).replace(/-/g,'')}_${testTicketId2.slice(-10)}_${Math.floor(Math.random()*100000)}`;

    await ticketRepository.createTicket(testTicketId2, { ...ticketData, id: testTicketId2 });
    await orderRepository.createOrder({
        id: testOrderId2,
        userId: testUserId,
        eventId: testEventId,
        organizerId: testUserId,
        status: 'pending_payment',
        subtotalAmount: 150000,
        discountAmount: 0,
        feeAmount: 0,
        totalAmount: 150000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
        items: [{
            id: testOrderItemId2,
            ticketId: testTicketId2,
            quantity: 1,
            unitPrice: 150000,
            subtotal: 150000,
            totalAmount: 150000,
            status: 'pending',
            createdAt: now,
        }],
    });
    await orderRepository.createPaymentAttempt({
        id: testPaymentAttemptId2,
        orderId: testOrderId2,
        ticketId: testTicketId2,
        status: 'pending',
        paymentMethod: 'zalopay',
        provider: 'zalopay',
        providerOrderId: zaloAppTransId2,
        amount: 150000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
    });
    await orderRepository.linkTicketToOrder(testTicketId2, testOrderId2, testOrderItemId2, testPaymentAttemptId2);

    const concurrentDataStr = JSON.stringify({
        app_id: 2554,
        app_trans_id: zaloAppTransId2,
        zp_trans_id: 'zp_trans_concurrent',
        amount: 150000,
        embed_data: JSON.stringify({ ticket_id: testTicketId2 })
    });
    const concurrentMac = crypto.createHmac('sha256', key2).update(concurrentDataStr).digest('hex');

    // Trigger concurrently
    const [res1, res2] = await Promise.all([
        client.post('/payments/callback', { data: concurrentDataStr, mac: concurrentMac }),
        client.post('/payments/callback', { data: concurrentDataStr, mac: concurrentMac })
    ]);

    assert('Concurrent res1 status 200', res1.status === 200);
    assert('Concurrent res2 status 200', res2.status === 200);
    assert('Concurrent res1 return_code is 1', res1.data.return_code === 1);
    assert('Concurrent res2 return_code is 1', res2.data.return_code === 1);

    const ledgerCountConcurrent = (await query('SELECT COUNT(*) FROM ledger_entries WHERE order_id = $1', [testOrderId2])).rows[0].count;
    assert('Only one ledger entry created for concurrent requests', Number(ledgerCountConcurrent) === 1);

    // --- CASE 4: Check-status vs callback race (FOR UPDATE serialisation) ---
    console.log('\n  [Case 4: Check-status vs Callback Race]');
    const testTicketId4 = `tkt_pay_${uuidv4()}`;
    const testOrderId4 = `ord_pay_${uuidv4()}`;
    const testOrderItemId4 = `oi_pay_${uuidv4()}`;
    const testPaymentAttemptId4 = `pa_pay_${uuidv4()}`;
    const zaloAppTransId4 = `${new Date().toISOString().slice(2,10).replace(/-/g,'')}_${testTicketId4.slice(-10)}_${Math.floor(Math.random()*100000)}`;

    await ticketRepository.createTicket(testTicketId4, { ...ticketData, id: testTicketId4, zaloAppTransId: zaloAppTransId4 });
    await orderRepository.createOrder({
        id: testOrderId4,
        userId: testUserId,
        eventId: testEventId,
        organizerId: testUserId,
        status: 'pending_payment',
        subtotalAmount: 150000,
        discountAmount: 0,
        feeAmount: 0,
        totalAmount: 150000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
        items: [{
            id: testOrderItemId4,
            ticketId: testTicketId4,
            quantity: 1,
            unitPrice: 150000,
            subtotal: 150000,
            totalAmount: 150000,
            status: 'pending',
            createdAt: now,
        }],
    });
    await orderRepository.createPaymentAttempt({
        id: testPaymentAttemptId4,
        orderId: testOrderId4,
        ticketId: testTicketId4,
        status: 'pending',
        paymentMethod: 'zalopay',
        provider: 'zalopay',
        providerOrderId: zaloAppTransId4,
        amount: 150000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
    });
    await orderRepository.linkTicketToOrder(testTicketId4, testOrderId4, testOrderItemId4, testPaymentAttemptId4);

    // Stub queryZaloPayOrder to return success so check-status processes the transition
    const originalQuery = require('@/modules/payments/application/service').queryZaloPayOrder;
    require('@/modules/payments/application/service').queryZaloPayOrder = async () => {
        return { return_code: 1, zp_trans_id: 'zp_trans_race', app_trans_id: zaloAppTransId4 };
    };

    const raceCallbackDataStr = JSON.stringify({
        app_id: 2554,
        app_trans_id: zaloAppTransId4,
        zp_trans_id: 'zp_trans_race_cb',
        amount: 150000,
        embed_data: JSON.stringify({ ticket_id: testTicketId4 })
    });
    const raceMac = crypto.createHmac('sha256', key2).update(raceCallbackDataStr).digest('hex');

    // Fire check-status and callback concurrently — the FOR UPDATE lock on
    // the payment attempt serialises them so only one terminal transition occurs
    const raceCheckKey = `chk_${uuidv4()}`;
    const [raceCsRes, raceCbRes] = await Promise.all([
        client.post('/payments/check-status', { ticketId: testTicketId4 }, {
            headers: { Authorization: `Bearer ${testUserToken}`, 'X-Idempotency-Key': raceCheckKey }
        }),
        client.post('/payments/callback', { data: raceCallbackDataStr, mac: raceMac })
    ]);

    assert('Race check-status: status 200', raceCsRes.status === 200);
    assert('Race callback: status 200', raceCbRes.status === 200);

    const raceTicket = await ticketRepository.getTicketById(testTicketId4);
    assert('Race: ticket status is paid', raceTicket.status === 'paid');

    const raceLedgerCount = (await query('SELECT COUNT(*) FROM ledger_entries WHERE order_id = $1', [testOrderId4])).rows[0].count;
    assert('Race: exactly one ledger entry created', Number(raceLedgerCount) === 1);

    // Restore original mock
    require('@/modules/payments/application/service').queryZaloPayOrder = originalQuery;

    // --- CASE 5: Check-status idempotency (duplicate key replay vs new key progression) ---
    console.log('\n  [Case 5: Check-Status Idempotency Key]');
    const testTicketId5 = `tkt_pay_${uuidv4()}`;
    const testOrderId5 = `ord_pay_${uuidv4()}`;
    const testOrderItemId5 = `oi_pay_${uuidv4()}`;
    const testPaymentAttemptId5 = `pa_pay_${uuidv4()}`;
    const zaloAppTransId5 = `${new Date().toISOString().slice(2,10).replace(/-/g,'')}_${testTicketId5.slice(-10)}_${Math.floor(Math.random()*100000)}`;
    const checkKey1 = `chk_${uuidv4()}`;
    const checkKey2 = `chk_${uuidv4()}`;

    await ticketRepository.createTicket(testTicketId5, { ...ticketData, id: testTicketId5, zaloAppTransId: zaloAppTransId5 });
    await orderRepository.createOrder({
        id: testOrderId5,
        userId: testUserId,
        eventId: testEventId,
        organizerId: testUserId,
        status: 'pending_payment',
        subtotalAmount: 150000,
        discountAmount: 0,
        feeAmount: 0,
        totalAmount: 150000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
        items: [{
            id: testOrderItemId5,
            ticketId: testTicketId5,
            quantity: 1,
            unitPrice: 150000,
            subtotal: 150000,
            totalAmount: 150000,
            status: 'pending',
            createdAt: now,
        }],
    });
    await orderRepository.createPaymentAttempt({
        id: testPaymentAttemptId5,
        orderId: testOrderId5,
        ticketId: testTicketId5,
        status: 'pending',
        paymentMethod: 'zalopay',
        provider: 'zalopay',
        providerOrderId: zaloAppTransId5,
        amount: 150000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
    });
    await orderRepository.linkTicketToOrder(testTicketId5, testOrderId5, testOrderItemId5, testPaymentAttemptId5);

    const originalQuery5 = require('@/modules/payments/application/service').queryZaloPayOrder;
    let queryCount = 0;
    require('@/modules/payments/application/service').queryZaloPayOrder = async () => {
        queryCount++;
        return { return_code: 1, zp_trans_id: 'zp_trans_chk_idem', app_trans_id: zaloAppTransId5 };
    };

    // First check-status with unique key — should process and transition
    const cs1 = await client.post('/payments/check-status', { ticketId: testTicketId5 }, {
        headers: { Authorization: `Bearer ${testUserToken}`, 'X-Idempotency-Key': checkKey1 }
    });
    assert('Case5: first status check returns 200', cs1.status === 200);
    assert('Case5: first status check status is paid', cs1.data.status === 'paid');

    const ticketAfterCs1 = await ticketRepository.getTicketById(testTicketId5);
    assert('Case5: ticket is paid after first check', ticketAfterCs1.status === 'paid');

    const ledgerAfter1 = (await query('SELECT COUNT(*) FROM ledger_entries WHERE order_id = $1', [testOrderId5])).rows[0].count;
    assert('Case5: one ledger entry after first check', Number(ledgerAfter1) === 1);

    // Duplicate same-key check-status — must replay cached 200/paid without ZaloPay query
    const queryCountBeforeDup = queryCount;
    const csDup = await client.post('/payments/check-status', { ticketId: testTicketId5 }, {
        headers: { Authorization: `Bearer ${testUserToken}`, 'X-Idempotency-Key': checkKey1 }
    });
    assert('Case5: duplicate key returns 200', csDup.status === 200);
    assert('Case5: duplicate key status is paid', csDup.data.status === 'paid');
    assert('Case5: duplicate key replayed cache (no extra ZaloPay query)', queryCount === queryCountBeforeDup);

    const ledgerAfterDup = (await query('SELECT COUNT(*) FROM ledger_entries WHERE order_id = $1', [testOrderId5])).rows[0].count;
    assert('Case5: no extra ledger entry from duplicate key', Number(ledgerAfterDup) === 1);

    // A new unique key on the already-paid ticket — should observe paid state without double-processing
    const csNewKey = await client.post('/payments/check-status', { ticketId: testTicketId5 }, {
        headers: { Authorization: `Bearer ${testUserToken}`, 'X-Idempotency-Key': checkKey2 }
    });
    assert('Case5: new key returns 200', csNewKey.status === 200);
    assert('Case5: new key observes paid state', csNewKey.data.status === 'paid');

    const ledgerAfterNew = (await query('SELECT COUNT(*) FROM ledger_entries WHERE order_id = $1', [testOrderId5])).rows[0].count;
    assert('Case5: no double ledger from new key', Number(ledgerAfterNew) === 1);

    // Restore original mock
    require('@/modules/payments/application/service').queryZaloPayOrder = originalQuery5;

    // --- CASE 6: State Machine Overwrite Protection (Terminal -> other) ---
    console.log('\n  [Case 6: State Machine Protection (Terminal State Block)]');
    // Try to update the payment attempt testPaymentAttemptId2 (which is already 'succeeded') directly via Repository to 'pending'
    let transitionError = null;
    try {
        await orderRepository.updatePaymentAttempt(testPaymentAttemptId2, { status: 'pending' });
    } catch (err) {
        transitionError = err;
    }
    assert('Repository updates blocked from terminal status succeeded to pending', transitionError !== null);
    if (transitionError) {
        assert('Error message contains terminal status information', transitionError.message.includes('Invalid payment attempt transition'));
    }

    // Try to send a success callback on a failed attempt
    // Let's first mock check-status to report a failure, which marks attempt as failed
    const testTicketId3 = `tkt_pay_${uuidv4()}`;
    const testOrderId3 = `ord_pay_${uuidv4()}`;
    const testOrderItemId3 = `oi_pay_${uuidv4()}`;
    const testPaymentAttemptId3 = `pa_pay_${uuidv4()}`;
    const zaloAppTransId3 = `${new Date().toISOString().slice(2,10).replace(/-/g,'')}_${testTicketId3.slice(-10)}_${Math.floor(Math.random()*100000)}`;

    await ticketRepository.createTicket(testTicketId3, { ...ticketData, id: testTicketId3, zaloAppTransId: zaloAppTransId3 });
    await orderRepository.createOrder({
        id: testOrderId3,
        userId: testUserId,
        eventId: testEventId,
        organizerId: testUserId,
        status: 'pending_payment',
        subtotalAmount: 150000,
        discountAmount: 0,
        feeAmount: 0,
        totalAmount: 150000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
        items: [{
            id: testOrderItemId3,
            ticketId: testTicketId3,
            quantity: 1,
            unitPrice: 150000,
            subtotal: 150000,
            totalAmount: 150000,
            status: 'pending',
            createdAt: now,
        }],
    });
    await orderRepository.createPaymentAttempt({
        id: testPaymentAttemptId3,
        orderId: testOrderId3,
        ticketId: testTicketId3,
        status: 'pending',
        paymentMethod: 'zalopay',
        provider: 'zalopay',
        providerOrderId: zaloAppTransId3,
        amount: 150000,
        currency: 'VND',
        createdAt: now,
        updatedAt: now,
    });
    await orderRepository.linkTicketToOrder(testTicketId3, testOrderId3, testOrderItemId3, testPaymentAttemptId3);

    // Mock queryZaloPayOrder for check-status to return 2 (failure)
    const originalQueryZaloPayOrder = require('@/modules/payments/application/service').queryZaloPayOrder;
    require('@/modules/payments/application/service').queryZaloPayOrder = async () => {
        return { return_code: 2, sub_return_code: 0, return_message: "Giao dịch thất bại" };
    };

    const statusKey1 = `chk_${uuidv4()}`;
    const checkStatusResponse = await client.post('/payments/check-status', { ticketId: testTicketId3 }, {
        headers: { Authorization: `Bearer ${testUserToken}`, 'X-Idempotency-Key': statusKey1 }
    });
    assert('POST /payments/check-status returned status 200', checkStatusResponse.status === 200);
    assert('check-status response status is failed', checkStatusResponse.data.status === 'failed');

    const attemptCase5 = (await query('SELECT status FROM payment_attempts WHERE id = $1', [testPaymentAttemptId3])).rows[0];
    assert('Payment attempt transitioned to failed', attemptCase5.status === 'failed');

    const ticketCase5 = await ticketRepository.getTicketById(testTicketId3);
    assert('Ticket status transitioned to cancelled', ticketCase5.status === 'cancelled');

    // Restore original mock
    require('@/modules/payments/application/service').queryZaloPayOrder = originalQueryZaloPayOrder;

    // Send callback to the failed attempt
    console.log('\n  [Case 7: Webhook callback rejected on terminal (failed) attempt]');
    const failedCallbackDataStr = JSON.stringify({
        app_id: 2554,
        app_trans_id: zaloAppTransId3,
        zp_trans_id: 'zp_trans_failed_webhook',
        amount: 150000,
        embed_data: JSON.stringify({ ticket_id: testTicketId3 })
    });
    const failedMac = crypto.createHmac('sha256', key2).update(failedCallbackDataStr).digest('hex');

    const failedCallbackResponse = await client.post('/payments/callback', {
        data: failedCallbackDataStr,
        mac: failedMac
    });
    assert('Failed callback returns code 0', failedCallbackResponse.data.return_code === 0);
    assert('Failed callback returns status terminal error message', failedCallbackResponse.data.return_message.includes('Cannot overwrite terminal status'));

    // DB remains cancelled (failTicketPayment sets ticket to 'cancelled')
    const ticketFinalCheck = await ticketRepository.getTicketById(testTicketId3);
    assert('Ticket status remains cancelled after rejected callback', ticketFinalCheck.status === 'cancelled');

    console.log('\n  [Cleanup DB]');
    const cleanupIds = [testOrderId, testOrderId2, testOrderId3, testOrderId4, testOrderId5];
    for (const orderId of cleanupIds) {
        await query('DELETE FROM ledger_entries WHERE order_id = $1', [orderId]);
        await query('DELETE FROM payment_attempts WHERE order_id = $1', [orderId]);
        await query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
        await query('DELETE FROM orders WHERE id = $1', [orderId]);
    }
    await query('DELETE FROM tickets WHERE user_id = $1', [testUserId]);
    await query('DELETE FROM events WHERE id = $1', [testEventId]);
    await query('DELETE FROM auth_users WHERE id = $1', [testUserId]);
    assert('cleanup completed successfully', true);

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
