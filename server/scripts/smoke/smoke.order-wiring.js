#!/usr/bin/env node
/**
 * smoke.order-wiring.js
 *
 * Validates shadow order/payment wiring behind ticket booking:
 *  1. POST /tickets/book creates a linked order + order_item in the same transaction
 *  2. Returned ticket payload does NOT expose orderId/orderItemId/paymentAttemptId
 *  3. createPaymentAttempt + link produces a linked payment_attempt
 *  4. Ticket repository shape still clean after payment attempt link
 *
 * Run: node scripts/smoke.order-wiring.js
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

const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const ticketService = require('@/modules/tickets/application/service');
const ticketRepository = require('@/providers/database/ticket.repository');
const orderRepository = require('@/providers/database/order.repository');
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

async function run() {
    console.log('');
    console.log('smoke.order-wiring.js');
    console.log('──────────────────────');

    const testUserId = `usr_test_${uuidv4()}`;
    const testEventId = `evt_test_${uuidv4()}`;
    const ticketTypeKey = 'standard';
    const now = Date.now();

    // ── 1. Create synthetic event with ticket types (raw SQL setup) ──
    console.log('\n  [Setup]');

    const ticketTypes = {
        standard: { name: 'Standard', price: 50000, available: 10, total: 10 },
    };

    await query(
        `INSERT INTO auth_users (id, email, password_hash, roles, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [testUserId, `${testUserId}@smoke.test`, 'x', ['user']]
    );
    await query(
        `INSERT INTO user_profiles (id, name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [testUserId, 'Wire User']
    );
    await query(
        `INSERT INTO events (
            id, name, description, date, event_type, organizer_id,
            min_price, status, visibility,
            category, tags, sponsors,
            hot_score, view_count, required_age, is_outdoor,
            created_at, last_updated_at, raw_data
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
            testEventId,
            'Shadow Wiring Test Event',
            'Test event for order wiring smoke',
            new Date(now),
            'physical',
            testUserId,
            50000,
            'active',
            'public',
            [],
            [],
            JSON.stringify([]),
            0, 0, 0, false,
            new Date(now), new Date(now), JSON.stringify({ ticketTypes }),
        ]
    );
    await query(
        `INSERT INTO event_ticket_types (
            id, event_id, code, name, price, capacity, available, sold_count, sort_order, is_active, created_at, updated_at
         ) VALUES ($1,$2,'standard','Standard',50000,10,10,0,0,true,$3,$3)`,
        [`${testEventId}:standard`, testEventId, new Date(now)]
    );
    assert(`test event "${testEventId}" created`, true);

    // ── 2. Book ticket ──
    console.log('\n  [bookTicket shadow order]');

    const newTicket = await ticketService.bookTicket(testUserId, testEventId, ticketTypeKey, 2, null);
    const ticketId = newTicket.id;

    assert('ticket id returned', ticketId && ticketId.startsWith('tkt_'));
    assert('ticket eventId matches', newTicket.eventId === testEventId);
    assert('ticket type matches', newTicket.type === ticketTypeKey);
    assert('ticket quantity is 2', newTicket.quantity === 2);
    assert('ticket price is 100000', newTicket.price === 100000);
    assert('ticket status is pending', newTicket.status === 'pending');

    // ── 3. Verify ticket payload has NO order fields ──
    console.log('\n  [Ticket payload shape]');

    assert('ticket has no orderId', newTicket.orderId === undefined);
    assert('ticket has no orderItemId', newTicket.orderItemId === undefined);
    assert('ticket has no paymentAttemptId', newTicket.paymentAttemptId === undefined);
    assert('ticket has no order_id', newTicket.order_id === undefined);
    assert('ticket has no order_item_id', newTicket.order_item_id === undefined);
    assert('ticket has no payment_attempt_id', newTicket.payment_attempt_id === undefined);

    // ── 4. Verify DB has linked order + order_item ──
    console.log('\n  [DB shadow order linkage]');

    const link = await orderRepository.getTicketOrderLink(ticketId);
    assert('ticket has linked order', link !== null);
    assert('orderId is present', link.orderId !== null && link.orderId.startsWith('ord_'));
    assert('orderItemId is present', link.orderItemId !== null && link.orderItemId.startsWith('oi_'));

    const order = await orderRepository.getOrderById(link.orderId);
    assert('order found in DB', order !== null);
    assert('order.userId matches', order.userId === testUserId);
    assert('order.eventId matches', order.eventId === testEventId);
    assert('order.status = pending_payment', order.status === ORDER_STATUS.PENDING_PAYMENT);
    assert('order.totalAmount = 100000', order.totalAmount === 100000);
    assert('order.subtotalAmount = 100000', order.subtotalAmount === 100000);
    assert('order.discountAmount = 0 (no promo)', order.discountAmount === 0);
    assert('order has 1 item', order.items.length === 1);

    const orderItem = order.items[0];
    assert('orderItem.ticketId matches ticket', orderItem.ticketId === ticketId);
    assert('orderItem.ticketType matches', orderItem.ticketType === ticketTypeKey);
    assert('orderItem.eventId matches', orderItem.eventId === testEventId);
    assert('orderItem.quantity = 2', orderItem.quantity === 2);
    assert('orderItem.unitPrice = 50000', orderItem.unitPrice === 50000);
    assert('orderItem.subtotal = 100000', orderItem.subtotal === 100000);
    assert('orderItem.totalAmount = 100000', orderItem.totalAmount === 100000);
    assert('orderItem.status = pending', orderItem.status === 'pending');

    // ── 5. Ticket repository still returns clean shape ──
    console.log('\n  [Ticket repository shape]');

    const ticketFromRepo = await ticketRepository.getTicketById(ticketId);
    assert('ticket found via repo', ticketFromRepo !== null);
    assert('repo ticket has no orderId', ticketFromRepo.orderId === undefined);
    assert('repo ticket has no orderItemId', ticketFromRepo.orderItemId === undefined);
    assert('repo ticket has no paymentAttemptId', ticketFromRepo.paymentAttemptId === undefined);
    assert('repo ticket eventId preserved', ticketFromRepo.eventId === testEventId);
    assert('repo ticket status preserved', ticketFromRepo.status === 'pending');

    // ── 6. Payment attempt creation (simulates create-order path) ──
    console.log('\n  [Payment attempt shadow]');

    const paId = `pa_${uuidv4()}`;
    await orderRepository.createPaymentAttempt({
        id: paId,
        orderId: link.orderId,
        ticketId,
        status: PAYMENT_STATUS.PROCESSING,
        paymentMethod: 'zalopay',
        provider: 'zalopay',
        providerOrderId: `app_trans_id_test`,
        amount: 100000,
        currency: 'VND',
        responsePayload: { return_code: 1, order_url: 'https://test.com/pay' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });

    // Link it to the ticket
    await orderRepository.linkTicketToOrder(ticketId, undefined, undefined, paId);

    const link2 = await orderRepository.getTicketOrderLink(ticketId);
    assert('ticket has linked payment_attempt_id', link2.paymentAttemptId === paId);
    assert('ticket orderId still intact', link2.orderId === link.orderId);

    const order2 = await orderRepository.getOrderById(link.orderId);
    assert('payment_attempt visible on order', order2.paymentAttempts.length >= 1);
    const pa = order2.paymentAttempts.find(a => a.id === paId);
    assert('payment_attempt found in order', pa !== null);
    assert('pa.status = processing', pa.status === PAYMENT_STATUS.PROCESSING);
    assert('pa.provider = zalopay', pa.provider === 'zalopay');
    assert('pa.paymentMethod = zalopay', pa.paymentMethod === 'zalopay');

    // ── 7. Ticket shape still clean after payment attempt link ──
    console.log('\n  [Ticket shape after payment link]');

    const ticketAfterPa = await ticketRepository.getTicketById(ticketId);
    assert('ticket still clean after PA link', ticketAfterPa !== null);
    assert('no orderId after PA', ticketAfterPa.orderId === undefined);
    assert('no paymentAttemptId after PA', ticketAfterPa.paymentAttemptId === undefined);
    assert('ticket eventId still intact', ticketAfterPa.eventId === testEventId);
    assert('ticket status still pending', ticketAfterPa.status === 'pending');

    // ── 8. Payment_attempt status update (simulates confirmTicketPayment path) ──
    console.log('\n  [Payment attempt status update]');

    await orderRepository.updatePaymentAttempt(paId, {
        status: PAYMENT_STATUS.SUCCEEDED,
        completedAt: Date.now(),
    });

    const order3 = await orderRepository.getOrderById(link.orderId);
    const paUpdated = order3.paymentAttempts.find(a => a.id === paId);
    assert('pa status updated to succeeded', paUpdated.status === PAYMENT_STATUS.SUCCEEDED);
    assert('pa completedAt set', paUpdated.completedAt !== null);

    // ── 9. Shadow SQL failure isolation (SAVEPOINT keeps outer transaction alive) ──
    console.log('\n  [Shadow SQL failure isolation]');

    // Use a fresh event to avoid pre-existing raw_data corruption from earlier updateEvent
    const failEventId = `evt_fail_${uuidv4()}`;
    await query(
        `INSERT INTO events (
            id, name, description, date, event_type, organizer_id,
            min_price, status, visibility,
            category, tags, sponsors,
            hot_score, view_count, required_age, is_outdoor,
            created_at, last_updated_at, raw_data
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
        [
            failEventId,
            'Shadow Fail Test Event',
            'Test event for shadow failure isolation smoke',
            new Date(now),
            'physical',
            testUserId,
            50000,
            'active',
            'public',
            [], [], JSON.stringify([]),
            0, 0, 0, false,
            new Date(now), new Date(now), null,
        ]
    );
    await query(
        `INSERT INTO event_ticket_types (
            id, event_id, code, name, price, capacity, available, sold_count, sort_order, is_active, created_at, updated_at
         ) VALUES ($1,$2,'standard','Standard',50000,5,5,0,0,true,$3,$3)`,
        [`${failEventId}:standard`, failEventId, new Date(now)]
    );

    const originalCreateOrder = orderRepository.createOrderInTransaction;
    let shadowFailureCaught = false;
    orderRepository.createOrderInTransaction = async (tx) => {
        shadowFailureCaught = true;
        await tx.query('SELECT * FROM definitely_missing_shadow_table');
    };

    let failTicketId = null;
    try {
        const failTicket = await ticketService.bookTicket(testUserId, failEventId, ticketTypeKey, 1, null);
        failTicketId = failTicket.id;

        assert('shadow-fail: ticket id returned', failTicket && failTicket.id.startsWith('tkt_'));
        assert('shadow-fail: ticket status is pending', failTicket.status === 'pending');
        assert('shadow-fail: no orderId leaked', failTicket.orderId === undefined);

        const failLink = await orderRepository.getTicketOrderLink(failTicketId);
        assert('shadow-fail: no order linkage', failLink === null || failLink.orderId === null);
        assert('shadow-fail: shadow code was reached', shadowFailureCaught === true);
    } catch (err) {
        assert(`shadow-fail: unexpected error - ${err.message}`, false);
    } finally {
        orderRepository.createOrderInTransaction = originalCreateOrder;
    }

    if (failTicketId) {
        const failLink = await orderRepository.getTicketOrderLink(failTicketId);
        if (failLink && failLink.orderId) {
            await query('UPDATE tickets SET order_id = NULL, order_item_id = NULL, payment_attempt_id = NULL WHERE id = $1', [failTicketId]);
            await query('DELETE FROM payment_attempts WHERE order_id = $1', [failLink.orderId]);
            await query('DELETE FROM order_items WHERE order_id = $1', [failLink.orderId]);
            await query('DELETE FROM orders WHERE id = $1', [failLink.orderId]);
        }
        await query('DELETE FROM tickets WHERE id = $1', [failTicketId]);
    }
    await query('DELETE FROM events WHERE id = $1', [failEventId]);

    // ── Cleanup ──
    console.log('\n  [Cleanup]');

    await query('UPDATE tickets SET order_id = NULL, order_item_id = NULL, payment_attempt_id = NULL WHERE id = $1', [ticketId]);
    await query('DELETE FROM payment_attempts WHERE order_id = $1', [link.orderId]);
    await query('DELETE FROM order_items WHERE order_id = $1', [link.orderId]);
    await query('DELETE FROM orders WHERE id = $1', [link.orderId]);
    await query('DELETE FROM tickets WHERE id = $1', [ticketId]);
    await query('DELETE FROM events WHERE id = $1', [testEventId]);

    assert('cleanup completed', true);

    // ── Summary ──
    console.log('');
    console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
    console.log('');

    process.exit(FAIL.length > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
});
