#!/usr/bin/env node
/**
 * smoke.order-foundation.js
 *
 * Validates:
 *  1. Migration 019/020 tables exist (orders, order_items, payment_attempts)
 *  2. Key columns exist via information_schema
 *  3. createOrder + getOrderById round-trip (via repository)
 *  4. createPaymentAttempt + updatePaymentAttempt (via repository)
 *  5. linkTicketToOrder (via repository)
 *  6. updateOrderStatus (via repository)
 *  7. Transaction atomicity (rollback on failure)
 *  8. New refined columns exist
 *  9. Indexes exist
 * 10. Ticket repository shape unchanged after linking order data
 * 11. Hidden column (raw_data) stores correctly
 *
 * Run: node scripts/smoke.order-foundation.js
 */

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

process.env.DATABASE_PROVIDER = 'postgres';
process.env.ORDER_DATABASE_PROVIDER = 'postgres';
process.env.TICKET_DATABASE_PROVIDER = 'postgres';

require('./../src/alias-bootstrap');

const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('@/providers/database/postgres.client');
const orderRepository = require('@/providers/database/order.repository');
const ticketRepository = require('@/providers/database/ticket.repository');
const { ORDER_STATUS, PAYMENT_STATUS } = require('@/modules/orders/domain/order-status');

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

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const orderId = `ord_${uuidv4()}`;
const itemId = `oi_${uuidv4()}`;
const ticketId = `tkt_${uuidv4()}`;
const paId = `pa_${uuidv4()}`;
const now = Date.now();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function run() {
    console.log('');
    console.log('smoke.order-foundation.js');
    console.log('──────────────────────────');

    // ── 1. Tables exist (raw SQL: information_schema) ──
    console.log('\n  [Tables exist]');

    const tables = ['orders', 'order_items', 'payment_attempts'];
    for (const tbl of tables) {
        const r = await query(
            'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
            [tbl]
        );
        assert(`table "${tbl}" exists`, r.rows[0].exists);
    }

    // ── 2. Key columns exist (raw SQL: information_schema) ──
    console.log('\n  [Key columns exist]');

    const requiredColumns = [
        { table: 'orders', column: 'id' },
        { table: 'orders', column: 'user_id' },
        { table: 'orders', column: 'status' },
        { table: 'orders', column: 'event_id' },
        { table: 'orders', column: 'organizer_id' },
        { table: 'orders', column: 'subtotal_amount' },
        { table: 'orders', column: 'discount_amount' },
        { table: 'orders', column: 'fee_amount' },
        { table: 'orders', column: 'total_amount' },
        { table: 'orders', column: 'idempotency_key' },
        { table: 'orders', column: 'expires_at' },
        { table: 'orders', column: 'paid_at' },
        { table: 'orders', column: 'cancelled_at' },
        { table: 'order_items', column: 'ticket_type' },
        { table: 'order_items', column: 'ticket_id' },
        { table: 'order_items', column: 'seat_id' },
        { table: 'order_items', column: 'status' },
        { table: 'order_items', column: 'total_amount' },
        { table: 'payment_attempts', column: 'ticket_id' },
        { table: 'payment_attempts', column: 'provider' },
        { table: 'payment_attempts', column: 'provider_order_id' },
        { table: 'payment_attempts', column: 'provider_transaction_id' },
        { table: 'payment_attempts', column: 'request_payload' },
        { table: 'payment_attempts', column: 'response_payload' },
        { table: 'payment_attempts', column: 'completed_at' },
        { table: 'payment_attempts', column: 'failure_reason' },
        { table: 'tickets', column: 'order_id' },
        { table: 'tickets', column: 'order_item_id' },
        { table: 'tickets', column: 'payment_attempt_id' },
    ];

    for (const { table, column } of requiredColumns) {
        const r = await query(
            `SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = $1 AND column_name = $2
            )`,
            [table, column]
        );
        assert(`"${table}.${column}" exists`, r.rows[0].exists);
    }

    // ── 3. Indexes exist (raw SQL: pg_indexes) ──
    console.log('\n  [Indexes exist]');

    const requiredIndexes = [
        'idx_orders_user_id',
        'idx_orders_event_id',
        'idx_orders_organizer_id',
        'idx_orders_status',
        'idx_orders_idempotency_key',
        'idx_orders_unique_idempotency',
        'idx_order_items_order_id',
        'idx_order_items_event_id',
        'idx_order_items_ticket_id',
        'idx_payment_attempts_order_id',
        'idx_payment_attempts_provider_order_id',
        'idx_payment_attempts_status',
        'idx_payment_attempts_ticket_id',
        'idx_tickets_order_id',
    ];

    for (const idxName of requiredIndexes) {
        const r = await query(
            `SELECT EXISTS (
                SELECT FROM pg_indexes WHERE indexname = $1
            )`,
            [idxName]
        );
        assert(`index "${idxName}" exists`, r.rows[0].exists);
    }

    // ── 4. createOrder round-trip (via repository) ──
    console.log('\n  [createOrder → getOrderById via repository]');

    await orderRepository.createOrder({
        id: orderId,
        userId: 'test-user',
        eventId: 'evt_test',
        organizerId: 'org_test',
        status: ORDER_STATUS.PENDING_PAYMENT,
        subtotalAmount: 80000,
        discountAmount: 10000,
        feeAmount: 5000,
        totalAmount: 75000,
        currency: 'VND',
        idempotencyKey: `idem_${uuidv4()}`,
        notes: 'integration test order',
        expiresAt: now + 3600000,
        createdAt: now,
        updatedAt: now,
        rawData: { source: 'smoke-test', version: 1 },
        items: [
            {
                id: itemId,
                ticketTypeId: 'vip',
                ticketType: 'VIP',
                eventId: 'evt_test',
                eventName: 'Test Event',
                ticketId: ticketId,
                seatId: 'A1',
                quantity: 2,
                unitPrice: 50000,
                subtotal: 100000,
                totalAmount: 100000,
                status: 'active',
                createdAt: now,
            },
        ],
    });

    const order = await orderRepository.getOrderById(orderId);
    assert('order found', order !== null);
    assert('order.userId', order.userId === 'test-user');
    assert('order.eventId', order.eventId === 'evt_test');
    assert('order.organizerId', order.organizerId === 'org_test');
    assert('order.status = pending_payment', order.status === ORDER_STATUS.PENDING_PAYMENT);
    assert('order.subtotalAmount = 80000', order.subtotalAmount === 80000);
    assert('order.discountAmount = 10000', order.discountAmount === 10000);
    assert('order.feeAmount = 5000', order.feeAmount === 5000);
    assert('order.totalAmount = 75000', order.totalAmount === 75000);
    assert('order.currency = VND', order.currency === 'VND');
    assert('order.idempotencyKey set', order.idempotencyKey !== null && order.idempotencyKey.startsWith('idem_'));
    assert('order.notes', order.notes === 'integration test order');
    assert('order.expiresAt > now', order.expiresAt > now);
    assert('order.createdAt set', order.createdAt !== null);
    assert('order.updatedAt set', order.updatedAt !== null);

    assert('order has 1 item', order.items.length === 1);
    const item = order.items[0];
    assert('item.ticketTypeId = vip', item.ticketTypeId === 'vip');
    assert('item.ticketType = VIP', item.ticketType === 'VIP');
    assert('item.eventId = evt_test', item.eventId === 'evt_test');
    assert('item.ticketId set', item.ticketId === ticketId);
    assert('item.seatId = A1', item.seatId === 'A1');
    assert('item.quantity = 2', item.quantity === 2);
    assert('item.unitPrice = 50000', item.unitPrice === 50000);
    assert('item.subtotal = 100000', item.subtotal === 100000);
    assert('item.totalAmount = 100000', item.totalAmount === 100000);
    assert('item.status = active', item.status === 'active');

    // ── 5. Hidden column (raw_data) stores correctly (raw SQL verify) ──
    console.log('\n  [Hidden column raw_data]');

    const rawCheck = await query('SELECT raw_data FROM orders WHERE id = $1', [orderId]);
    assert('raw_data is stored', rawCheck.rows.length === 1);
    assert('raw_data.source = smoke-test', rawCheck.rows[0].raw_data.source === 'smoke-test');

    // ── 6. Payment attempt create (via repository) ──
    console.log('\n  [createPaymentAttempt via repository]');

    await orderRepository.createPaymentAttempt({
        id: paId,
        orderId: orderId,
        ticketId: ticketId,
        status: PAYMENT_STATUS.PENDING,
        paymentMethod: 'zalopay',
        provider: 'zalopay',
        providerOrderId: `zp_${uuidv4()}`,
        providerTransactionId: `zptxn_${uuidv4()}`,
        transactionId: `txn_${uuidv4()}`,
        amount: 75000,
        currency: 'VND',
        requestPayload: { action: 'create', amount: 75000 },
        createdAt: now,
        updatedAt: now,
    });

    const order2 = await orderRepository.getOrderById(orderId);
    assert('order has 1 payment attempt', order2.paymentAttempts.length === 1);
    const pa = order2.paymentAttempts[0];
    assert('pa.status = pending', pa.status === PAYMENT_STATUS.PENDING);
    assert('pa.paymentMethod = zalopay', pa.paymentMethod === 'zalopay');
    assert('pa.provider = zalopay', pa.provider === 'zalopay');
    assert('pa.providerOrderId set', pa.providerOrderId !== null && pa.providerOrderId.startsWith('zp_'));
    assert('pa.providerTransactionId set', pa.providerTransactionId !== null);
    assert('pa.transactionId set', pa.transactionId !== null);
    assert('pa.amount = 75000', pa.amount === 75000);
    assert('pa.requestPayload stored', pa.requestPayload !== null && pa.requestPayload.action === 'create');

    // ── 7. Update payment attempt (via repository) ──
    console.log('\n  [updatePaymentAttempt via repository]');

    await orderRepository.updatePaymentAttempt(paId, {
        status: PAYMENT_STATUS.SUCCEEDED,
        providerTransactionId: `zptxn_final_${uuidv4()}`,
        responsePayload: { statusCode: '00', message: 'Success', zpTransId: '123456' },
        completedAt: Date.now(),
    });

    const order3 = await orderRepository.getOrderById(orderId);
    const pa2 = order3.paymentAttempts[0];
    assert('pa status updated to succeeded', pa2.status === PAYMENT_STATUS.SUCCEEDED);
    assert('pa providerTransactionId updated', pa2.providerTransactionId !== null && pa2.providerTransactionId.startsWith('zptxn_final_'));
    assert('pa responsePayload stored', pa2.responsePayload !== null && pa2.responsePayload.zpTransId === '123456');
    assert('pa completedAt set', pa2.completedAt !== null);

    // ── 8. Update order status (via repository) ──
    console.log('\n  [updateOrderStatus via repository]');

    await orderRepository.updateOrderStatus(orderId, ORDER_STATUS.PAID);
    const order4 = await orderRepository.getOrderById(orderId);
    assert('order status updated to paid', order4.status === ORDER_STATUS.PAID);

    // ── 9. Link ticket to order (via repository) ──
    console.log('\n  [linkTicketToOrder via repository]');

    await query(
        `INSERT INTO tickets (id, event_id, user_id, type, price, status, raw_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ticketId, 'evt_test', 'test-user', 'vip', 50000, 'active', '{}']
    );

    await orderRepository.linkTicketToOrder(ticketId, orderId, itemId, paId);

    const ticket = await query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    assert('ticket found', ticket.rows.length === 1);
    assert('ticket order_id linked', ticket.rows[0].order_id === orderId);
    assert('ticket order_item_id linked', ticket.rows[0].order_item_id === itemId);
    assert('ticket payment_attempt_id linked', ticket.rows[0].payment_attempt_id === paId);

    // ── 9b. Ticket repository shape unchanged (order linkage NOT exposed) ──
    const ticketViaRepo = await ticketRepository.getTicketById(ticketId);
    assert('ticket found via repository', ticketViaRepo !== null);
    assert('ticketViaRepo.eventId preserved', ticketViaRepo.eventId === 'evt_test');
    assert('ticketViaRepo.type preserved', ticketViaRepo.type === 'vip');
    assert('ticketViaRepo.status preserved', ticketViaRepo.status === 'active');
    assert('ticketViaRepo does not expose orderId', ticketViaRepo.orderId === undefined);
    assert('ticketViaRepo does not expose orderItemId', ticketViaRepo.orderItemId === undefined);
    assert('ticketViaRepo does not expose paymentAttemptId', ticketViaRepo.paymentAttemptId === undefined);
    assert('ticketViaRepo does not expose order_id', ticketViaRepo.order_id === undefined);
    assert('ticketViaRepo does not expose order_item_id', ticketViaRepo.order_item_id === undefined);
    assert('ticketViaRepo does not expose payment_attempt_id', ticketViaRepo.payment_attempt_id === undefined);

    // ── 10. Transaction atomicity (via repository) ──
    console.log('\n  [Transaction atomicity]');

    const failOrderId = `ord_${uuidv4()}`;
    const dupItemId = `oi_${uuidv4()}`;
    try {
        await orderRepository.createOrder({
            id: failOrderId,
            userId: 'test-user',
            items: [
                {
                    id: dupItemId,
                    ticketTypeId: 'general',
                    eventId: 'evt_test',
                    quantity: 1,
                    unitPrice: 50000,
                    subtotal: 50000,
                },
                {
                    id: dupItemId,
                    ticketTypeId: 'general',
                    eventId: 'evt_test',
                    quantity: 1,
                    unitPrice: 50000,
                    subtotal: 50000,
                },
            ],
        });
        assert('atomic rollback (should not reach here)', false);
    } catch (err) {
        assert('transaction rolled back on duplicate PK', err !== null);
    }

    const failOrder = await query('SELECT * FROM orders WHERE id = $1', [failOrderId]);
    assert('fail order NOT persisted after rollback', failOrder.rows.length === 0);

    // ── 11. Payment failure reason ──
    console.log('\n  [Payment failure reason]');

    const paFailId = `pa_${uuidv4()}`;
    await orderRepository.createPaymentAttempt({
        id: paFailId,
        orderId: orderId,
        status: PAYMENT_STATUS.FAILED,
        paymentMethod: 'zalopay',
        amount: 75000,
        failureReason: 'Insufficient balance',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });

    const order5 = await orderRepository.getOrderById(orderId);
    const paFail = order5.paymentAttempts.find(a => a.id === paFailId);
    assert('failed payment attempt found', paFail !== null);
    assert('failed pa status = failed', paFail.status === PAYMENT_STATUS.FAILED);
    assert('failed pa failureReason stored', paFail.failureReason === 'Insufficient balance');

    // ── 12. Processing payment status ──
    console.log('\n  [Processing payment status]');

    const paProcId = `pa_${uuidv4()}`;
    await orderRepository.createPaymentAttempt({
        id: paProcId,
        orderId: orderId,
        status: PAYMENT_STATUS.PROCESSING,
        paymentMethod: 'zalopay',
        amount: 75000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });

    const order6 = await orderRepository.getOrderById(orderId);
    const paProc = order6.paymentAttempts.find(a => a.id === paProcId);
    assert('processing payment attempt found', paProc !== null);
    assert('processing pa status = processing', paProc.status === PAYMENT_STATUS.PROCESSING);

    // ── 13. Order expired status ──
    console.log('\n  [Order expired status]');

    const expiredId = `ord_${uuidv4()}`;
    await orderRepository.createOrder({
        id: expiredId,
        userId: 'test-user',
        status: ORDER_STATUS.EXPIRED,
        totalAmount: 0,
        createdAt: now,
        updatedAt: now,
    });

    const expired = await orderRepository.getOrderById(expiredId);
    assert('expired order found', expired !== null);
    assert('expired order status = expired', expired.status === ORDER_STATUS.EXPIRED);

    await query('DELETE FROM orders WHERE id = $1', [expiredId]);

    // ── Cleanup (raw SQL for tickets, repository for order data) ──
    console.log('\n  [Cleanup]');

    await query(
        'UPDATE tickets SET order_id = NULL, order_item_id = NULL, payment_attempt_id = NULL WHERE id = $1',
        [ticketId]
    );
    await query('DELETE FROM tickets WHERE id = $1', [ticketId]);
    await query('DELETE FROM payment_attempts WHERE order_id = $1', [orderId]);
    await query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    await query('DELETE FROM orders WHERE id = $1', [orderId]);

    // Attest clean state
    const gone = await orderRepository.getOrderById(orderId);
    assert('order fully cleaned up', gone === null);

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------
    console.log('');
    console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
    console.log('');

    process.exit(FAIL.length > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
