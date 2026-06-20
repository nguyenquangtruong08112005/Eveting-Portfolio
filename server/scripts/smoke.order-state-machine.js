#!/usr/bin/env node
/**
 * smoke.order-state-machine.js
 *
 * Validates:
 *  1. Orders in pending_payment state can transition to paid, cancelled, or failed.
 *  2. Orders in terminal states (paid, cancelled, failed, expired) cannot transition to any other status.
 *  3. No-op updates (updating to the same terminal status) are permitted and do not throw.
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

const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('@/providers/database/postgres.client');
const orderRepository = require('@/providers/database/order.repository');
const { ORDER_STATUS } = require('@/modules/orders/domain/order-status');

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
    console.log('smoke.order-state-machine.js');
    console.log('────────────────────────────');

    const testUserId = `usr_ord_${uuidv4()}`;
    const testUserEmail = `ord_${uuidv4()}@test.com`;
    const now = Date.now();

    console.log('\n  [Setup DB Data]');
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'Order Test User', 'mock_hash', $3, true)`,
        [testUserId, testUserEmail, ['user']]
    );

    // --- CASE 1: Valid transition pending_payment -> paid ---
    console.log('\n  [Case 1: Valid transition pending_payment -> paid]');
    const orderId1 = `ord_${uuidv4()}`;
    await orderRepository.createOrder({
        id: orderId1,
        userId: testUserId,
        status: ORDER_STATUS.PENDING_PAYMENT,
        totalAmount: 100000,
        createdAt: now,
        updatedAt: now,
    });

    await orderRepository.updateOrderStatus(orderId1, ORDER_STATUS.PAID);
    const order1 = await orderRepository.getOrderById(orderId1);
    assert('Order transitioned to paid', order1.status === ORDER_STATUS.PAID);

    // --- CASE 2: Invalid transition paid -> pending_payment ---
    console.log('\n  [Case 2: Invalid transition paid -> pending_payment]');
    let errPaidToPending = null;
    try {
        await orderRepository.updateOrderStatus(orderId1, ORDER_STATUS.PENDING_PAYMENT);
    } catch (e) {
        errPaidToPending = e;
    }
    assert('Transition from paid to pending_payment blocked', errPaidToPending !== null);
    if (errPaidToPending) {
        assert('Error message contains transition guard info', errPaidToPending.message.includes('Invalid order status transition'));
    }

    // --- CASE 3: Idempotent transition paid -> paid ---
    console.log('\n  [Case 3: Idempotent transition paid -> paid]');
    let errPaidToPaid = null;
    try {
        await orderRepository.updateOrderStatus(orderId1, ORDER_STATUS.PAID);
    } catch (e) {
        errPaidToPaid = e;
    }
    assert('Transition from paid to paid (no-op) is allowed', errPaidToPaid === null);

    // --- CASE 4: Valid transition pending_payment -> cancelled ---
    console.log('\n  [Case 4: Valid transition pending_payment -> cancelled]');
    const orderId2 = `ord_${uuidv4()}`;
    await orderRepository.createOrder({
        id: orderId2,
        userId: testUserId,
        status: ORDER_STATUS.PENDING_PAYMENT,
        totalAmount: 200000,
        createdAt: now,
        updatedAt: now,
    });

    await orderRepository.updateOrderStatus(orderId2, ORDER_STATUS.CANCELLED);
    const order2 = await orderRepository.getOrderById(orderId2);
    assert('Order transitioned to cancelled', order2.status === ORDER_STATUS.CANCELLED);

    // --- CASE 5: Invalid transition cancelled -> paid ---
    console.log('\n  [Case 5: Invalid transition cancelled -> paid]');
    let errCancelledToPaid = null;
    try {
        await orderRepository.updateOrderStatus(orderId2, ORDER_STATUS.PAID);
    } catch (e) {
        errCancelledToPaid = e;
    }
    assert('Transition from cancelled to paid blocked', errCancelledToPaid !== null);

    // --- CASE 6: Valid transition pending_payment -> failed ---
    console.log('\n  [Case 6: Valid transition pending_payment -> failed]');
    const orderId3 = `ord_${uuidv4()}`;
    await orderRepository.createOrder({
        id: orderId3,
        userId: testUserId,
        status: ORDER_STATUS.PENDING_PAYMENT,
        totalAmount: 300000,
        createdAt: now,
        updatedAt: now,
    });

    await orderRepository.updateOrderStatus(orderId3, ORDER_STATUS.FAILED);
    const order3 = await orderRepository.getOrderById(orderId3);
    assert('Order transitioned to failed', order3.status === ORDER_STATUS.FAILED);

    // --- CASE 7: Invalid transition failed -> expired ---
    console.log('\n  [Case 7: Invalid transition failed -> expired]');
    let errFailedToExpired = null;
    try {
        await orderRepository.updateOrderStatus(orderId3, ORDER_STATUS.EXPIRED);
    } catch (e) {
        errFailedToExpired = e;
    }
    assert('Transition from failed to expired blocked', errFailedToExpired !== null);

    // --- CASE 8: Transactional updateOrderStatusInTransaction rollback ---
    console.log('\n  [Case 8: Transactional updateOrderStatusInTransaction rollback]');
    const orderId4 = `ord_${uuidv4()}`;
    await orderRepository.createOrder({
        id: orderId4,
        userId: testUserId,
        status: ORDER_STATUS.PENDING_PAYMENT,
        totalAmount: 400000,
        createdAt: now,
        updatedAt: now,
    });

    let transactionFailed = false;
    try {
        await transaction(async (tx) => {
            // First update order to PAID
            await orderRepository.updateOrderStatusInTransaction(tx, orderId4, ORDER_STATUS.PAID);
            // Then trigger an invalid transition (PAID -> CANCELLED) to force rollback
            await orderRepository.updateOrderStatusInTransaction(tx, orderId4, ORDER_STATUS.CANCELLED);
        });
    } catch (e) {
        transactionFailed = true;
    }

    assert('Transaction failed and rolled back', transactionFailed);
    const order4 = await orderRepository.getOrderById(orderId4);
    assert('Order status remained pending_payment after rollback', order4.status === ORDER_STATUS.PENDING_PAYMENT);

    console.log('\n  [Cleanup DB]');
    await query('DELETE FROM order_items WHERE order_id IN ($1, $2, $3, $4)', [orderId1, orderId2, orderId3, orderId4]);
    await query('DELETE FROM orders WHERE id IN ($1, $2, $3, $4)', [orderId1, orderId2, orderId3, orderId4]);
    await query('DELETE FROM auth_users WHERE id = $1', [testUserId]);
    assert('cleanup completed successfully', true);

    console.log('');
    console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
    console.log('');

    process.exit(FAIL.length > 0 ? 1 : 0);
}

run().catch((err) => {
    console.error('Unhandled error:', err.message || err);
    process.exit(1);
});
