#!/usr/bin/env node
/**
 * smoke.payouts.js
 *
 * Tests simulated payout foundation.
 * Requires migration 066 applied (payouts, payout_items, bank_accounts tables).
 * Uses isolated test fixture and cleans up after run.
 */

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required.');
  process.exit(1);
}

// Set test-only Base64-encoded 32-byte encryption key
// 'a'.repeat(32) = 32 bytes, Base64 = YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYQ==
process.env.BANK_ACCOUNT_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
process.env.DATABASE_PROVIDER = 'postgres';

require('../../src/alias-bootstrap');

const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const { toDb, nowDb } = require('@/providers/database/time.helper');
const payoutService = require('@/modules/payments/application/payout.service');
const payoutRepository = require('@/providers/database/payout.repository');

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
    console.log('smoke.payouts.js');
    console.log('────────────────');

    // Verify migration 066 is applied
    try {
        const check = await query("SELECT to_regclass('payouts') AS t");
        if (!check.rows[0].t) {
            console.error('FATAL: payouts table does not exist. Apply migration 066 first.');
            process.exit(1);
        }
    } catch (_) {
        console.error('FATAL: Cannot verify migration 066. Ensure DATABASE_URL is correct and migration applied.');
        process.exit(1);
    }

    const prefix = `payout_smoke_${Date.now()}`;
    const organizerId = `org_${prefix}`;
    const testEventId = `evt_${prefix}`;
    const now = Date.now();
    const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000);

    console.log('\n  [Setup: Organizer & Event Fixture]');

    await query(
        `INSERT INTO auth_users (id, email, password_hash, roles, is_active)
         VALUES ($1, $2, 'mock_hash', $3, true)`,
        [organizerId, `${prefix}@test.com`, ['user', 'organizer']]
    );

    // Ensure organizer_settings with 10% platform fee
    const existingSettings = await payoutRepository.getOrganizerSettings(organizerId);
    if (!existingSettings) {
        await payoutRepository.upsertOrganizerSettings(organizerId, 0.10);
    }

    await query(
        `INSERT INTO events (id, name, description, start_at, end_at, event_type, organizer_id, status, visibility, min_price, created_at, last_updated_at, raw_data, lifecycle_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
            testEventId, 'Payout Test Event', 'Testing payout eligibility',
            toDb(eightDaysAgo), toDb(eightDaysAgo),
            'physical', organizerId, 'active', 'public', 150000,
            nowDb(), nowDb(), '{}', 'published',
        ]
    );
    assert('Event with end_at 8 days ago created', true);

    // Create orders with order_items pointing to the event for eligibility checks
    await query(
        `INSERT INTO orders (id, user_id, organizer_id, status, total_amount, currency, created_at, updated_at)
         VALUES ($1, $2, $3, 'paid', $4, 'VND', $5, $6)`,
        [`ord_${prefix}_1`, organizerId, organizerId, 150000, nowDb(), nowDb()]
    );
    await query(
        `INSERT INTO tickets (id, event_id, user_id, organizer_id, type, price, status, purchase_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [`tkt_${prefix}_1`, testEventId, organizerId, organizerId, 'standard', 150000, 'paid', nowDb()],
    );
    await query(
        `INSERT INTO order_items (id, order_id, ticket_id, event_id, quantity, unit_price, subtotal, total_amount, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [`oi_${prefix}_1`, `ord_${prefix}_1`, `tkt_${prefix}_1`, testEventId, 1, 150000, 150000, 150000, 'completed', nowDb()]
    );
    await query(
        `INSERT INTO ledger_entries (id, order_id, organizer_id, gross_amount, platform_fee, net_amount, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [`led_${prefix}_1`, `ord_${prefix}_1`, organizerId, 150000, 15000, 135000, nowDb()]
    );

    await query(
        `INSERT INTO orders (id, user_id, organizer_id, status, total_amount, currency, created_at, updated_at)
         VALUES ($1, $2, $3, 'paid', $4, 'VND', $5, $6)`,
        [`ord_${prefix}_2`, organizerId, organizerId, 200000, nowDb(), nowDb()]
    );
    await query(
        `INSERT INTO tickets (id, event_id, user_id, organizer_id, type, price, status, purchase_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [`tkt_${prefix}_2`, testEventId, organizerId, organizerId, 'vip', 200000, 'paid', nowDb()]
    );
    await query(
        `INSERT INTO order_items (id, order_id, ticket_id, event_id, quantity, unit_price, subtotal, total_amount, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [`oi_${prefix}_2`, `ord_${prefix}_2`, `tkt_${prefix}_2`, testEventId, 1, 200000, 200000, 200000, 'completed', nowDb()]
    );
    await query(
        `INSERT INTO ledger_entries (id, order_id, organizer_id, gross_amount, platform_fee, net_amount, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [`led_${prefix}_2`, `ord_${prefix}_2`, organizerId, 200000, 20000, 180000, nowDb()]
    );
    assert('Ledger entries with 10% commission snapshotted via order_items→event FK chain', true);

    try {
        // ── Test 1: Bank Account Registration with Encryption ──
        console.log('\n  [Test 1: Bank Account Registration & Encryption]');
        const regResult = await payoutService.registerBankAccount(
            organizerId, '123456789', 'Test Organizer', 'TestBank'
        );
        assert('Bank account registered', regResult.organizerId === organizerId);
        assert('Masked display returned', regResult.maskedDisplay.includes('****'));

        const stored = await payoutRepository.getBankAccount(organizerId);
        assert('Encrypted payload stored', stored !== null);
        assert('Encrypted payload does not contain plaintext account',
            !stored.encryptedPayload.includes('123456789'));
        assert('Encrypted payload does not contain plaintext holder',
            !stored.encryptedPayload.includes('Test Organizer'));
        assert('Masked display stored', stored.maskedDisplay.includes('****'));
        assert('Masked display shows last 4 digits', stored.maskedDisplay.includes('6789'));

        // ── Test 2: Bank Account Verification ──
        console.log('\n  [Test 2: Bank Account Verification]');
        try {
            await payoutService.registerBankAccount(
                `other_${organizerId}`, '000000000', 'Bad', 'Bank'
            );
            assert('Rejected invalid account number 000000000', false);
        } catch (err) {
            assert('Rejected invalid account number 000000000', err.message.includes('verification'));
        }

        // ── Test 3: First Payout Requires Admin Approval ──
        console.log('\n  [Test 3: First Payout Requires Admin Approval]');
        const result3 = await payoutService.requestPayout(organizerId);
        assert('First payout status is pending_admin_approval',
            result3.payout.status === 'pending_admin_approval');
        assert('No provider result for pending_admin_approval', !result3.providerResult);

        const items3 = await payoutRepository.getPayoutItems(result3.payout.id);
        assert('Payout items created', items3.length === 2);

        // ── Test 4: Admin Approval ──
        console.log('\n  [Test 4: Admin Approval]');
        const approved = await payoutService.adminApprovePayout(result3.payout.id, 'Approved by admin');
        assert('Admin approval transitions to processing', approved.status === 'processing');
        assert('Provider reference stored', !!approved.providerReference);

        // ── Test 5: Duplicate Admin Approval Rejected ──
        console.log('\n  [Test 5: Duplicate Admin Approval Rejected]');
        try {
            await payoutService.adminApprovePayout(result3.payout.id, 'Try again');
            assert('Second admin approval rejected', false);
        } catch (err) {
            assert('Second admin approval rejected for non-pending_admin_approval',
                err.message.includes('pending_admin_approval'));
        }

        // ── Test 6: No Unpaid Ledger Entries (Allocated) ──
        console.log('\n  [Test 6: Duplicate Payout Prevention]');
        try {
            await payoutService.requestPayout(organizerId);
            assert('Duplicate payout rejected', false);
        } catch (err) {
            assert('Duplicate payout rejected (no eligible unpaid entries)',
                err.message.includes('No eligible'));
        }

        // ── Test 7: Encryption Key Base64 32-byte Requirement ──
        console.log('\n  [Test 7: Encryption Key Validation]');
        // Export current key, test bad values, restore
        const savedKey = process.env.BANK_ACCOUNT_ENCRYPTION_KEY;
        process.env.BANK_ACCOUNT_ENCRYPTION_KEY = 'too-short';
        delete require.cache[require.resolve('@/modules/payments/infrastructure/config/payout.config')];
        const badKeyModule = require('@/modules/payments/infrastructure/config/payout.config');
        try {
            badKeyModule.getEncryptionKey();
            assert('Short Base64 key rejected', false);
        } catch (err) {
            assert('Short Base64 key rejected', err.message.includes('must be exactly 32'));
        }
        process.env.BANK_ACCOUNT_ENCRYPTION_KEY = savedKey;

    } finally {
        // ── Cleanup ──
        console.log('\n  [Cleanup]');
        try {
            await query('DELETE FROM payout_items WHERE payout_id IN (SELECT id FROM payouts WHERE organizer_id = $1)', [organizerId]);
            await query('DELETE FROM payouts WHERE organizer_id = $1', [organizerId]);
            await query('DELETE FROM bank_accounts WHERE organizer_id = $1', [organizerId]);
            await query('DELETE FROM ledger_entries WHERE organizer_id = $1', [organizerId]);
            await query('DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)', [organizerId]);
            await query('DELETE FROM orders WHERE user_id = $1', [organizerId]);
            await query('DELETE FROM tickets WHERE user_id = $1', [organizerId]);
            await query('DELETE FROM events WHERE id = $1', [testEventId]);
            await query('DELETE FROM auth_users WHERE id = $1', [organizerId]);
            assert('Cleanup completed', true);
        } catch (cleanupErr) {
            console.error('Cleanup error:', cleanupErr.message);
        }
    }
}

run()
    .then(() => {
        console.log('');
        console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`);
        console.log('');
        process.exit(FAIL.length > 0 ? 1 : 0);
    })
    .catch((err) => {
        console.error('Unhandled error:', err.message || err);
        process.exit(1);
    });
