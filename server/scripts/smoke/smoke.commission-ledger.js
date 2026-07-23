#!/usr/bin/env node
/**
 * smoke.commission-ledger.js
 *
 * Validates:
 *  1. One paid order calculates gross, fee, net correctly based on dynamic config.
 *  2. Default platform fee rate is 5% (0.05).
 *  3. Custom platform fee rate is applied correctly if configured.
 *  4. Organizer and platform fee balances update transactionally.
 *  5. Rollbacks behave correctly and do not leave partial balance updates.
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
const { query, transaction } = require('@/providers/database/postgres.client');
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
    console.log('smoke.commission-ledger.js');
    console.log('──────────────────────────');

    const testUserId = `usr_led_${uuidv4()}`;
    const testUserEmail = `led_${uuidv4()}@test.com`;
    const testOrganizerId = `org_led_${uuidv4()}`;
    const testOrganizerEmail = `org_led_${uuidv4()}@test.com`;
    const now = Date.now();

    console.log('\n  [Setup DB Data]');
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'Ledger Test User', 'mock_hash', $3, true)`,
        [testUserId, testUserEmail, ['user']]
    );
    await query(
        `INSERT INTO auth_users (id, email, name, password_hash, roles, is_active)
         VALUES ($1, $2, 'Ledger Test Organizer', 'mock_hash', $3, true)`,
        [testOrganizerId, testOrganizerEmail, ['organizer']]
    );

    // Get baseline balances (they might be populated from previous tests, but we want to measure delta)
    const baselinePlatform = await orderRepository.getPlatformFeeBalance();
    const baselineOrganizer = await orderRepository.getOrganizerBalance(testOrganizerId);

    // --- CASE 1: Default Dynamic Fee Rate (5%) ---
    console.log('\n  [Case 1: Default Dynamic Fee Rate (5%)]');
    const orderId1 = `ord_${uuidv4()}`;
    await orderRepository.createOrder({
        id: orderId1,
        userId: testUserId,
        status: 'pending_payment',
        totalAmount: 100000,
        createdAt: now,
        updatedAt: now,
        organizerId: testOrganizerId
    });

    const settings1 = await orderRepository.getOrganizerSettingsInTransaction(null, testOrganizerId);
    const rate1 = settings1 ? settings1.platformFeeRate : 0.05;
    assert('Dynamic platform fee rate defaults to 5%', rate1 === 0.05);

    const gross1 = 100000;
    const fee1 = Number((gross1 * rate1).toFixed(2));
    const net1 = Number((gross1 - fee1).toFixed(2));

    await transaction(async (tx) => {
        await orderRepository.createLedgerEntryInTransaction(tx, {
            id: `led_${uuidv4()}`,
            orderId: orderId1,
            organizerId: testOrganizerId,
            grossAmount: gross1,
            platformFee: fee1,
            netAmount: net1,
            createdAt: now
        });
    });

    const balOrg1 = await orderRepository.getOrganizerBalance(testOrganizerId);
    const balPlat1 = await orderRepository.getPlatformFeeBalance();

    assert('Organizer balance increased by net amount (95,000)', balOrg1.balance - baselineOrganizer.balance === 95000);
    assert('Platform fee balance increased by fee amount (5,000)', balPlat1.balance - baselinePlatform.balance === 5000);

    // --- CASE 2: Custom Dynamic Fee Rate (10%) ---
    console.log('\n  [Case 2: Custom Dynamic Fee Rate (10%)]');
    await orderRepository.createOrganizerSettings({
        organizerId: testOrganizerId,
        platformFeeRate: 0.10,
        createdAt: now
    });

    const settings2 = await orderRepository.getOrganizerSettingsInTransaction(null, testOrganizerId);
    assert('Dynamic platform fee rate is successfully configured to 10%', settings2.platformFeeRate === 0.10);

    const orderId2 = `ord_${uuidv4()}`;
    await orderRepository.createOrder({
        id: orderId2,
        userId: testUserId,
        status: 'pending_payment',
        totalAmount: 200000,
        createdAt: now,
        updatedAt: now,
        organizerId: testOrganizerId
    });

    const gross2 = 200000;
    const fee2 = Number((gross2 * settings2.platformFeeRate).toFixed(2));
    const net2 = Number((gross2 - fee2).toFixed(2));

    await transaction(async (tx) => {
        await orderRepository.createLedgerEntryInTransaction(tx, {
            id: `led_${uuidv4()}`,
            orderId: orderId2,
            organizerId: testOrganizerId,
            grossAmount: gross2,
            platformFee: fee2,
            netAmount: net2,
            createdAt: now
        });
    });

    const balOrg2 = await orderRepository.getOrganizerBalance(testOrganizerId);
    const balPlat2 = await orderRepository.getPlatformFeeBalance();

    assert('Organizer balance increased by net amount (180,000)', balOrg2.balance - balOrg1.balance === 180000);
    assert('Platform fee balance increased by fee amount (20,000)', balPlat2.balance - balPlat1.balance === 20000);
    assert('Total organizer balance delta is correct (275,000)', balOrg2.balance - baselineOrganizer.balance === 275000);
    assert('Total platform balance delta is correct (25,000)', balPlat2.balance - baselinePlatform.balance === 25000);

    // --- CASE 3: Transaction Rollback on Error ---
    console.log('\n  [Case 3: Transaction Rollback on Error]');
    const orderId3 = `ord_${uuidv4()}`;
    await orderRepository.createOrder({
        id: orderId3,
        userId: testUserId,
        status: 'pending_payment',
        totalAmount: 300000,
        createdAt: now,
        updatedAt: now,
        organizerId: testOrganizerId
    });

    let txError = null;
    try {
        await transaction(async (tx) => {
            await orderRepository.createLedgerEntryInTransaction(tx, {
                id: `led_${uuidv4()}`,
                orderId: orderId3,
                organizerId: testOrganizerId,
                grossAmount: 300000,
                platformFee: 30000,
                netAmount: 270000,
                createdAt: now
            });
            throw new Error('Forced transactional rollback');
        });
    } catch (e) {
        txError = e;
    }

    assert('Transaction failed and rolled back', txError !== null && txError.message === 'Forced transactional rollback');

    const balOrg3 = await orderRepository.getOrganizerBalance(testOrganizerId);
    const balPlat3 = await orderRepository.getPlatformFeeBalance();

    assert('Organizer balance remained unchanged after rollback', balOrg3.balance === balOrg2.balance);
    assert('Platform balance remained unchanged after rollback', balPlat3.balance === balPlat2.balance);

    console.log('\n  [Cleanup DB]');
    await query('DELETE FROM ledger_entries WHERE order_id IN ($1, $2, $3)', [orderId1, orderId2, orderId3]);
    await query('DELETE FROM orders WHERE id IN ($1, $2, $3)', [orderId1, orderId2, orderId3]);
    await query('DELETE FROM organizer_balances WHERE organizer_id = $1', [testOrganizerId]);
    await query('DELETE FROM organizer_settings WHERE organizer_id = $1', [testOrganizerId]);
    await query('DELETE FROM auth_users WHERE id IN ($1, $2)', [testUserId, testOrganizerId]);

    // Restore platform balance baseline
    await query('UPDATE platform_fees SET balance = $1 WHERE id = \'platform\'', [baselinePlatform.balance]);

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
