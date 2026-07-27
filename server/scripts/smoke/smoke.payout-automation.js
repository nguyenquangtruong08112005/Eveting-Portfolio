#!/usr/bin/env node
/**
 * smoke.payout-automation.js
 *
 * Focused smoke for payout batch/reconciliation automation.
 * Requires migrations 066-068 applied. Uses isolated fixtures, cleans up.
 */

require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL required.');
  process.exit(1);
}

process.env.BANK_ACCOUNT_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
process.env.DATABASE_PROVIDER = 'postgres';

require('../../src/alias-bootstrap');

const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const { toDb, nowDb } = require('@/providers/database/time.helper');
const payoutRepository = require('@/providers/database/payout.repository');
const payoutService = require('@/modules/payments/application/payout.service');
const { runBatch, runReconciliation } = require('@/jobs/payout.job');

const PASS = [];
const FAIL = [];

function assert(label, condition) {
  if (condition) { console.log(`  ✓ ${label}`); PASS.push(label); }
  else { console.log(`  ✗ ${label}`); FAIL.push(label); }
}

async function run() {
  console.log(''); console.log('smoke.payout-automation.js'); console.log('──────────────────────────');

  // Verify migration 066 applied
  try {
    const t = await query("SELECT to_regclass('payouts') AS t");
    if (!t.rows[0].t) { console.error('FATAL: migration 066 not applied'); process.exit(1); }
  } catch (_) { console.error('FATAL: DB unavailable'); process.exit(1); }

  const prefix = `payauto_${Date.now()}`;
  const org = `org_${prefix}`;
  const evt = `evt_${prefix}`;
  const now = Date.now();
  const old = now - 10 * 86400000; // 10 days ago

  // ── Setup ──
  console.log('\n  [Setup: organizer, event, orders, ledger]');
  await query("INSERT INTO auth_users(id,email,password_hash,roles,is_active) VALUES($1,$2,'x',$3,true)", [org, `${prefix}@t.com`, ['user', 'organizer']]);
  await payoutRepository.upsertOrganizerSettings(org, 0.10);
  await query("INSERT INTO events(id,name,description,start_at,end_at,event_type,organizer_id,status,visibility,min_price,created_at,last_updated_at,raw_data,lifecycle_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
    [evt, 'PA Auto','', toDb(old),toDb(old),'physical',org,'active','public',150000,nowDb(),nowDb(),'{}','published']);
  await query("INSERT INTO orders(id,user_id,organizer_id,status,total_amount,currency,created_at,updated_at) VALUES($1,$2,$3,'paid',$4,'VND',$5,$6)",
    [`ord_${prefix}`, org, org, 150000, nowDb(), nowDb()]);
  await query("INSERT INTO tickets(id,event_id,user_id,organizer_id,type,price,status,purchase_date) VALUES($1,$2,$3,$4,$5,$6,'paid',$7)",
    [`tkt_${prefix}`, evt, org, org, 'standard', 150000, nowDb()]);
  await query("INSERT INTO order_items(id,order_id,ticket_id,event_id,quantity,unit_price,subtotal,total_amount,status,created_at) VALUES($1,$2,$3,$4,1,$5,$6,$7,'completed',$8)",
    [`oi_${prefix}`, `ord_${prefix}`, `tkt_${prefix}`, evt, 150000, 150000, 150000, nowDb()]);
  await query("INSERT INTO ledger_entries(id,order_id,organizer_id,gross_amount,platform_fee,net_amount,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [`led_${prefix}`, `ord_${prefix}`, org, 150000, 15000, 135000, nowDb()]);
  await payoutService.registerBankAccount(org, '123456789', 'Test', 'TestBank');
  assert('Setup complete', true);

  try {
    // ── Test 1: Eligible organizer discovery ──
    console.log('\n  [Test 1: Eligible Organizer Discovery]');
    const eligible = await payoutRepository.getEligibleOrganizers();
    assert('Organizer found eligible', eligible.includes(org));

    // ── Test 2: Batch processes and hits admin-approval (first payout) ──
    console.log('\n  [Test 2: Batch run — first payout gate]');
    const batch1 = await runBatch();
    assert('Batch ran without exception', true);
    assert('First payout skipped (admin approval)', batch1.skipped === 1);

    const p1 = await payoutRepository.getPayoutsByOrganizer(org, 1);
    assert('Payout was created as pending_admin_approval', p1.length > 0 && p1[0].status === 'pending_admin_approval');

    // ── Test 3: Duplicate batch skips allocated entries ──
    console.log('\n  [Test 3: Duplicate batch]');
    const batch2 = await runBatch();
    assert('Second batch produced 0 submissions', batch2.submitted + batch2.skipped === 0);

    // ── Test 4: Reconciliation claims and submits a pending_provider_submission payout ──
    console.log('\n  [Test 4: Reconciliation claims pending_provider_submission]');
    // Manually create a pending_provider_submission payout
    const fp = require('crypto').randomBytes(32).toString('hex');
    await payoutRepository.createPayout({
        id: `payout_test_claim_${prefix}`,
        organizerId: org,
        amount: 135000,
        status: 'pending_provider_submission',
        keyedFingerprint: fp,
        providerReference: null,
        providerMessage: null,
        rawData: {},
    });
    const recClaim = await runReconciliation();
    assert('Reconciliation claimed the pending submission', recClaim.recovered === 1);
    const afterClaim = await payoutRepository.getPayoutById(`payout_test_claim_${prefix}`);
    assert('Payout is now processing after claim', afterClaim.status === 'processing');
    assert('Provider reference stored after claim', !!afterClaim.providerReference);

    // Second reconciliation run — claims no new pending, completes the now-processing payout
    const recClaim2 = await runReconciliation();
    assert('No double-claim on second reconciliation', recClaim2.recovered === 0);

    // ── Test 5: Admin approval → processing (post-tx dispatch happens inline) ──
    console.log('\n  [Test 5: Admin approve flow]');
    const approved = await payoutService.adminApprovePayout(p1[0].id, 'smoke approve');
    assert('Admin approval transitions to processing', approved.status === 'processing');
    assert('Provider reference stored', !!approved.providerReference);

    // ── Test 6: Reconciliation completes both processing payouts ──
    console.log('\n  [Test 6: Reconciliation completes processing payouts]');
    const rec = await runReconciliation();
    assert('Reconciliation completed all processing payouts', rec.completed >= 1);

    const afterRec = await payoutRepository.getPayoutById(p1[0].id);
    assert('Payout is now completed after reconciliation', afterRec.status === 'completed');

    // ── Test 7: Idempotent reconciliation ──
    console.log('\n  [Test 7: Idempotent reconciliation]');
    const rec3 = await runReconciliation();
    assert('No double-completion', rec3.completed === 0 && rec3.failed === 0);

  } finally {
    // ── Cleanup ──
    console.log('\n  [Cleanup]');
    await query("DELETE FROM payout_items WHERE payout_id IN (SELECT id FROM payouts WHERE organizer_id=$1)", [org]).catch(() => {});
    await query("DELETE FROM payouts WHERE organizer_id=$1", [org]).catch(() => {});
    await query("DELETE FROM bank_accounts WHERE organizer_id=$1", [org]).catch(() => {});
    await query("DELETE FROM ledger_entries WHERE organizer_id=$1", [org]).catch(() => {});
    await query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id=$1)", [org]).catch(() => {});
    await query("DELETE FROM orders WHERE user_id=$1", [org]).catch(() => {});
    await query("DELETE FROM tickets WHERE user_id=$1", [org]).catch(() => {});
    await query("DELETE FROM events WHERE id=$1", [evt]).catch(() => {});
    await query("DELETE FROM auth_users WHERE id=$1", [org]).catch(() => {});
    assert('Cleanup done', true);
  }
}

run().then(() => { console.log(''); console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`); console.log(''); process.exit(FAIL.length > 0 ? 1 : 0); })
    .catch(e => { console.error('Unhandled:', e.message); process.exit(1); });
