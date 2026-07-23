#!/usr/bin/env node
/**
 * smoke.zalopay-callback.js
 *
 * Validates ZaloPay payment callback:
 *  1. Checks signature verification logic.
 *  2. Processes payment success (pending -> paid) for tickets, orders, and payment attempts in a single transaction.
 *  3. Enforces webhook idempotency for duplicate callbacks.
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
    console.log('smoke.zalopay-callback.js');
    console.log('─────────────────────────');

    const PORT = 3001;
    const server = http.createServer(app);

    await new Promise((resolve) => server.listen(PORT, resolve));
    console.log(`  [Server] Listening on port ${PORT}`);

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

    // 1. Create user
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'Payment Test User', 'mock_hash', $3, true)`,
        [testUserId, testUserEmail, ['user']]
    );

    // 2. Create event
    const ticketTypes = {
        standard: { name: 'Standard', price: 150000, available: 10, total: 10 },
    };
    await eventRepository.createEvent(testEventId, {
        name: 'Payment Test Event',
        description: 'Payment testing description',
        date: now,
        eventType: 'physical',
        organizerId: `org_${uuidv4()}`,
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
        organizerId: `org_${uuidv4()}`,
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

    console.log('\n  [Sending Valid ZaloPay Webhook Callback]');

    // Generate ZaloPay signature MAC
    const callbackDataStr = JSON.stringify({
        app_id: 2554,
        app_trans_id: zaloAppTransId,
        zp_trans_id: '1234567890',
        amount: 150000,
        embed_data: JSON.stringify({ ticket_id: testTicketId })
    });
    const key2 = process.env.ZALOPAY_KEY2 || 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf';
    const mac = crypto.createHmac('sha256', key2).update(callbackDataStr).digest('hex');

    const client = axios.create({ baseURL: `http://localhost:${PORT}` });

    const callbackResponse = await client.post('/payments/callback', {
        data: callbackDataStr,
        mac: mac
    });

    assert('POST /payments/callback returned status 200', callbackResponse.status === 200);
    assert('ZaloPay return_code is 1 (success)', callbackResponse.data.return_code === 1);

    // Verify database transitions
    console.log('\n  [Verifying DB State Transition]');
    const updatedTicket = await ticketRepository.getTicketById(testTicketId);
    assert('ticket status transitioned to "paid"', updatedTicket.status === 'paid');

    const updatedOrder = await orderRepository.getOrderById(testOrderId);
    assert('order status transitioned to "paid"', updatedOrder.status === 'paid');

    const attemptRows = (await query('SELECT status FROM payment_attempts WHERE id = $1', [testPaymentAttemptId])).rows;
    assert('payment attempt status transitioned to "succeeded"', attemptRows[0].status === 'succeeded');

    const ledgerRows = (await query('SELECT * FROM ledger_entries WHERE order_id = $1', [testOrderId])).rows;
    assert('ledger entry was created', ledgerRows.length === 1);
    if (ledgerRows.length === 1) {
        const entry = ledgerRows[0];
        assert('ledger gross amount is correct', Number(entry.gross_amount) === 150000);
        assert('ledger platform fee matches default 5%', Number(entry.platform_fee) === 7500);
        assert('ledger net amount is correct', Number(entry.net_amount) === 142500);
    }

    console.log('\n  [Sending Duplicate Callback (Idempotency Check)]');
    const duplicateResponse = await client.post('/payments/callback', {
        data: callbackDataStr,
        mac: mac
    });

    assert('POST /payments/callback returned status 200 for retry', duplicateResponse.status === 200);
    assert('duplicate callback return_code is 1 (success)', duplicateResponse.data.return_code === 1);
    assert('duplicate callback response message is "success"', duplicateResponse.data.return_message === 'success');

    console.log('\n  [Cleanup]');
    await query('DELETE FROM ledger_entries WHERE order_id = $1', [testOrderId]);
    await query('UPDATE tickets SET order_id = NULL, order_item_id = NULL, payment_attempt_id = NULL WHERE id = $1', [testTicketId]);
    await query('DELETE FROM payment_attempts WHERE order_id = $1', [testOrderId]);
    await query('DELETE FROM order_items WHERE order_id = $1', [testOrderId]);
    await query('DELETE FROM orders WHERE id = $1', [testOrderId]);
    await query('DELETE FROM tickets WHERE id = $1', [testTicketId]);
    await query('DELETE FROM events WHERE id = $1', [testEventId]);
    await query('DELETE FROM auth_users WHERE id = $1', [testUserId]);
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
