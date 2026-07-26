/**
 * Verification Script for Deterministic Vietnam Portfolio Demo Seed.
 *
 * Queries PostgreSQL database, verifies exact acceptance counts and demo user logins.
 *
 * Usage (from server/):
 *   node scripts/seed/verify-seed.js
 *   npm run db:seed:verify
 */
require('../../src/alias-bootstrap');
require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is required for verification.');
  process.exit(1);
}

const { query } = require('@/providers/database/postgres.client');
const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const { STATUS, VISIBILITY, LIFECYCLE } = require('@/modules/events/domain/event-lifecycle');

async function main() {
  console.log('\n=======================================================');
  console.log('  VERIFICATION REPORT: Vietnam Portfolio Demo Seeding');
  console.log('=======================================================\n');

  let overallPass = true;
  const results = [];

  function record(metric, count, threshold, passed, details = '') {
    if (!passed) overallPass = false;
    results.push({ metric, count, threshold: `>= ${threshold}`, status: passed ? 'PASS' : 'FAIL', details });
  }

  // 1. Total Venues Count
  const vRes = await query(`SELECT COUNT(*)::int AS count FROM venues WHERE id LIKE 'demo_venue_%' AND deleted_at IS NULL`);
  const vCount = vRes.rows[0]?.count || 0;
  record('Total Venues (Vietnam)', vCount, 20, vCount >= 20);

  // 2. Published Future Public Events Count
  const eRes = await query(
    `SELECT COUNT(*)::int AS count FROM events
     WHERE id LIKE 'demo_evt_%' AND status = $1 AND visibility = $2 AND lifecycle_status = $3 AND start_at > NOW() AND deleted_at IS NULL`,
    [STATUS.ACTIVE, VISIBILITY.PUBLIC, LIFECYCLE.PUBLISHED]
  );
  const eCount = eRes.rows[0]?.count || 0;
  record('Total Published Future Public Events', eCount, 50, eCount >= 50);

  // 3. Category Breakdown — 6 canonical categories matching web/src/lib/constants.ts
  const categories = ['music', 'arts', 'sports', 'workshop', 'nightlife', 'tech'];
  for (const cat of categories) {
    const catRes = await query(
      `SELECT COUNT(*)::int AS count FROM events
       WHERE id LIKE 'demo_evt_%' AND status = $1 AND visibility = $2 AND lifecycle_status = $3 AND start_at > NOW() AND deleted_at IS NULL AND (category @> $4::text[] OR category::text LIKE $5)`,
      [STATUS.ACTIVE, VISIBILITY.PUBLIC, LIFECYCLE.PUBLISHED, [cat], `%${cat}%`]
    );
    const cCount = catRes.rows[0]?.count || 0;
    record(`Events Category: [${cat}]`, cCount, 10, cCount >= 10);
  }

  // 4. Seat-Map-Ready Events
  const smEvtRes = await query(
    `SELECT COUNT(*)::int AS count FROM events
     WHERE id LIKE 'demo_evt_%' AND (raw_data->>'seatMapId' IS NOT NULL OR raw_data->'raw_data'->>'seatMapId' IS NOT NULL)`
  );
  const smSeatsRes = await query(`SELECT COUNT(*)::int AS count FROM seats WHERE id LIKE 'demo_seat_%'`);
  const smEvtCount = smEvtRes.rows[0]?.count || 0;
  const seatsCount = smSeatsRes.rows[0]?.count || 0;
  record('Seat-Map-Ready Events', smEvtCount, 1, smEvtCount >= 1 && seatsCount > 0, `Seats populated: ${seatsCount}`);

  // 5. Featured Profiles
  const fpRes = await query(`SELECT COUNT(*)::int AS count FROM featured_profiles WHERE id LIKE 'demo_feat_%'`);
  const fpCount = fpRes.rows[0]?.count || 0;
  record('Featured Profiles (Artists/Speakers)', fpCount, 5, fpCount >= 5);

  // 6. Promotions Vouchers
  const prRes = await query(`SELECT COUNT(*)::int AS count FROM promotions WHERE id LIKE 'demo_promo_%'`);
  const prCount = prRes.rows[0]?.count || 0;
  record('Promotions / Vouchers', prCount, 5, prCount >= 5);

  // 7. Reviews
  const revRes = await query(`SELECT COUNT(*)::int AS count FROM reviews WHERE id LIKE 'demo_rev_%'`);
  const revCount = revRes.rows[0]?.count || 0;
  record('Reviews & Ratings', revCount, 10, revCount >= 10);

  // 8. Event Media Gallery
  const medRes = await query(`SELECT COUNT(*)::int AS count FROM event_media WHERE id LIKE 'demo_media_%'`);
  const medCount = medRes.rows[0]?.count || 0;
  record('Event Media Gallery Items', medCount, 10, medCount >= 10);

  // 9. Demo Users & Password Login Check
  const uRes = await query(`SELECT id, email, password_hash FROM auth_users WHERE email = 'admin@eventing.moteo.fun' LIMIT 1`);
  let loginPassed = false;
  if (uRes.rows.length > 0) {
    loginPassed = await backendAuthProvider.verifyPassword('123456', uRes.rows[0].password_hash);
  }
  record('Demo User Login Verification (password: 123456)', loginPassed ? 1 : 0, 1, loginPassed, 'Email: admin@eventing.moteo.fun');

  // Print Results Table
  console.log('| Metric | Count | Required | Status | Details |');
  console.log('| :--- | :---: | :---: | :---: | :--- |');
  for (const r of results) {
    console.log(`| ${r.metric.padEnd(42)} | ${String(r.count).padStart(5)} | ${r.threshold.padStart(8)} | ${r.status.padStart(6)} | ${r.details} |`);
  }

  console.log('\n-------------------------------------------------------');
  if (overallPass) {
    console.log('  STATUS: ALL ACCEPTANCE CRITERIA PASSED [OK]\n');
    process.exit(0);
  } else {
    console.log('  STATUS: SOME ASSERTIONS FAILED [FAIL]\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('FATAL: verify-seed failed:', err.message || err);
  process.exit(1);
});
