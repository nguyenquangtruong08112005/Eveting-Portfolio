#!/usr/bin/env node
/**
 * smoke.payout-api.js - Tests payout finance API (organizer + admin).
 * Requires migrations 066-069 applied. Uses isolated fixtures.
 */

require('dotenv').config({ quiet: true });
if (!process.env.DATABASE_URL) { console.error('FATAL: DATABASE_URL required.'); process.exit(1); }

process.env.BANK_ACCOUNT_ENCRYPTION_KEY = Buffer.from('a'.repeat(32)).toString('base64');
process.env.DATABASE_PROVIDER = 'postgres';

require('../../src/alias-bootstrap');

const { v4: uuidv4 } = require('uuid');
const { query } = require('@/providers/database/postgres.client');
const { toDb, nowDb } = require('@/providers/database/time.helper');
const payoutRepository = require('@/providers/database/payout.repository');
const payoutService = require('@/modules/payments/application/payout.service');

const PASS = [], FAIL = [];
function assert(l, c) { if (c) { console.log(`  \u2713 ${l}`); PASS.push(l); } else { console.log(`  \u2717 ${l}`); FAIL.push(l); } }

async function run() {
  console.log(''); console.log('smoke.payout-api.js'); console.log('──────────────────────');
  try {
    const t = await query("SELECT to_regclass('payouts') AS t");
    if (!t.rows[0].t) { console.error('FATAL: migration 066 not applied'); process.exit(1); }
  } catch (_) { console.error('FATAL: DB unavailable'); process.exit(1); }

  const prefix = `payapi_${Date.now()}`;
  const org = `org_${prefix}`;
  const evt = `evt_${prefix}`;
  const now = Date.now();
  const old = now - 10 * 86400000;

  console.log('\n  [Setup]');
  await query("INSERT INTO auth_users(id,email,password_hash,roles,is_active) VALUES($1,$2,'x',$3,true)", [org, `${prefix}@t.com`, ['user', 'organizer']]);
  await payoutRepository.upsertOrganizerSettings(org, 0.10);
  await query("INSERT INTO events(id,name,description,start_at,end_at,event_type,organizer_id,status,visibility,min_price,created_at,last_updated_at,raw_data,lifecycle_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
    [evt,'PA API','',toDb(old),toDb(old),'physical',org,'active','public',150000,nowDb(),nowDb(),'{}','published']);
  await query("INSERT INTO orders(id,user_id,organizer_id,status,total_amount,currency,created_at,updated_at) VALUES($1,$2,$3,'paid',$4,'VND',$5,$6)", [`ord_${prefix}`,org,org,150000,nowDb(),nowDb()]);
  await query("INSERT INTO tickets(id,event_id,user_id,organizer_id,type,price,status,purchase_date) VALUES($1,$2,$3,$4,$5,$6,'paid',$7)", [`tkt_${prefix}`,evt,org,org,'standard',150000,nowDb()]);
  await query("INSERT INTO order_items(id,order_id,ticket_id,event_id,quantity,unit_price,subtotal,total_amount,status,created_at) VALUES($1,$2,$3,$4,1,$5,$6,$7,'completed',$8)",
    [`oi_${prefix}`, `ord_${prefix}`, `tkt_${prefix}`, evt, 150000, 150000, 150000, nowDb()]);
  await query("INSERT INTO ledger_entries(id,order_id,organizer_id,gross_amount,platform_fee,net_amount,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [`led_${prefix}`, `ord_${prefix}`, org, 150000, 15000, 135000, nowDb()]);
  assert('Fixture ready', true);

  try {
    // ── Test 1: Bank account register + GET masked only ──
    console.log('\n  [Test 1: Bank account registration and masked GET]');
    const reg = await payoutService.registerBankAccount(org, '123456789', 'Tester', 'TestBank');
    assert('Registration returns masked display', reg.maskedDisplay.includes('****'));

    const safe = await payoutRepository.getBankAccountSafe(org);
    assert('Safe DTO has maskedDisplay', safe.maskedDisplay.includes('****'));
    assert('Safe DTO has no encryptedPayload', !safe.encryptedPayload);
    assert('Safe DTO has no keyedFingerprint', !safe.keyedFingerprint);

    // ── Test 2: Summary arithmetic ──
    console.log('\n  [Test 2: Payout summary arithmetic]');
    const summary = await payoutRepository.getPayoutSummaryByOrganizer(org);
    assert('eligibleNetAmount is 135000', summary.eligibleNetAmount === 135000);
    assert('pendingApprovalAmount is 0', summary.pendingApprovalAmount === 0);
    assert('processingAmount is 0', summary.processingAmount === 0);
    assert('completedAmount is 0', summary.completedAmount === 0);

    // ── Test 3: Create payouts ──
    console.log('\n  [Test 3: Create payouts with various statuses]');
    const fp1 = require('crypto').randomBytes(32).toString('hex');
    await payoutRepository.createPayout({ id: `pay_pa_approve_${prefix}`, organizerId: org, amount: 135000, status: 'pending_admin_approval', keyedFingerprint: fp1, rawData: {} });
    await payoutRepository.createPayout({ id: `pay_pa_proc_${prefix}`, organizerId: org, amount: 50000, status: 'processing', keyedFingerprint: require('crypto').randomBytes(32).toString('hex'), providerReference: 'sim_ref', rawData: {} });
    await payoutRepository.createPayout({ id: `pay_pa_done_${prefix}`, organizerId: org, amount: 80000, status: 'completed', keyedFingerprint: require('crypto').randomBytes(32).toString('hex'), rawData: {} });

    // ── Test 4: Summary after creating payouts ──
    console.log('\n  [Test 4: Summary includes payout amounts]');
    const s2 = await payoutRepository.getPayoutSummaryByOrganizer(org);
    assert('pendingApprovalAmount is 135000', s2.pendingApprovalAmount === 135000);
    assert('processingAmount is 50000', s2.processingAmount === 50000);
    assert('completedAmount is 80000', s2.completedAmount === 80000);
    assert('eligibleNetAmount unchanged at 135000', s2.eligibleNetAmount === 135000);

    // ── Test 5: Paginated organizer list ──
    console.log('\n  [Test 5: Paginated organizer payout list]');
    const list = await payoutRepository.getPayoutsByOrganizerPaginated(org, 10, 0);
    assert('Total payouts is 3', list.total === 3);
    const first = list.payouts[0];
    assert('DTO has no keyedFingerprint', !first.keyedFingerprint);
    assert('DTO has no rawData', !first.rawData);
    assert('DTO has id', !!first.id);
    assert('DTO has amount', first.amount > 0);

    // ── Test 6: Admin paginated list with status filter ──
    console.log('\n  [Test 6: Admin paginated list with status filter]');
    const all = await payoutRepository.getAllPayoutsPaginated(10, 0, null);
    assert('Admin list has all payouts', all.total >= 3);

    const completed = await payoutRepository.getAllPayoutsPaginated(10, 0, 'completed');
    assert('Filtered completed list has 1', completed.total === 1);
    const cDto = completed.payouts[0];
    assert('Admin DTO has no keyedFingerprint', !cDto.keyedFingerprint);
    assert('Admin DTO has no rawData', !cDto.rawData);
    assert('Admin DTO has organizerId', !!cDto.organizerId);

    // ── Test 7: Admin approval state transition ──
    console.log('\n  [Test 7: Admin approval changes status]');
    const approved = await payoutService.adminApprovePayout(`pay_pa_approve_${prefix}`, 'approve via smoke');
    assert('Approved payout is now processing', approved.status === 'processing');
    assert('Provider reference set', !!approved.providerReference);

    // ── Test 8: Summary after approval ──
    console.log('\n  [Test 8: Summary after admin approval]');
    const s3 = await payoutRepository.getPayoutSummaryByOrganizer(org);
    assert('pendingApprovalAmount decreased to 0', s3.pendingApprovalAmount === 0);
    assert('processingAmount increased to 185000', s3.processingAmount === 185000);

  } finally {
    console.log('\n  [Cleanup]');
    await query("DELETE FROM payout_items WHERE payout_id IN (SELECT id FROM payouts WHERE organizer_id=$1)", [org]).catch(()=>{});
    await query("DELETE FROM payouts WHERE organizer_id=$1", [org]).catch(()=>{});
    await query("DELETE FROM bank_accounts WHERE organizer_id=$1", [org]).catch(()=>{});
    await query("DELETE FROM ledger_entries WHERE organizer_id=$1", [org]).catch(()=>{});
    await query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id=$1)", [org]).catch(()=>{});
    await query("DELETE FROM orders WHERE user_id=$1", [org]).catch(()=>{});
    await query("DELETE FROM tickets WHERE user_id=$1", [org]).catch(()=>{});
    await query("DELETE FROM events WHERE id=$1", [evt]).catch(()=>{});
    await query("DELETE FROM auth_users WHERE id=$1", [org]).catch(()=>{});
    assert('Cleanup done', true);
  }
}

run().then(() => { console.log(''); console.log(`  Total: ${PASS.length} passed, ${FAIL.length} failed`); console.log(''); process.exit(FAIL.length>0?1:0); })
    .catch(e => { console.error('Unhandled:', e.message); process.exit(1); });
