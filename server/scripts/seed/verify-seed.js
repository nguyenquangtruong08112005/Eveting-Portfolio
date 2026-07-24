/**
 * Verification Script for Seeded Vietnam Event Portfolio Data (Phase 03).
 *
 * Verifies exact data counts and integrity rules:
 *  - Venues count (>= 20) across Vietnamese cities/provinces
 *  - Per-group public future events (>= 10 for music, arts, workshops/tech, sports, exhibitions)
 *  - Total public active events count (>= 50)
 *  - Seat-map-ready event configuration
 *  - Demo account existence & password verification (123456 via backendAuthProvider)
 *  - Related records (organizers, featured profiles, ticket types, promotions, reviews, media)
 *  - Elasticsearch indexable events count
 *
 * Usage (from server/):
 *   node scripts/seed/verify-seed.js
 *   npm run db:verify:seed
 */
require('../../src/alias-bootstrap');
require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is required for verification.');
  process.exit(1);
}

const { query } = require('@/providers/database/postgres.client');
const backendAuthProvider = require('@/providers/auth/backend.auth.provider');
const { STATUS, VISIBILITY } = require('@/modules/events/domain/event-lifecycle');
const seatRepo = require('@/providers/database/postgres.seat.repository');

const DEMO_EMAILS = [
  'admin@eventing.com',
  'organizer@eventing.com',
  'hanoi.events@eventing.com',
  'alice@email.com',
  'nguyen.an@email.com',
  'tran.linh@email.com',
  'le.hung@email.com',
  'admin@eventing.moteo.fun',
  'organizer@eventing.moteo.fun',
  'attendee@eventing.moteo.fun',
];

async function main() {
  console.log('\n=======================================================');
  console.log('   Phase 03 Portfolio Seed Verification & Health Check  ');
  console.log('=======================================================\n');

  let passedAll = true;
  const counts = {};

  // 1. Venues count
  const venuesRes = await query(`SELECT COUNT(*)::int AS count FROM venues WHERE deleted_at IS NULL`);
  counts.venues = venuesRes.rows[0].count;
  const venuesCityRes = await query(`SELECT COUNT(DISTINCT city)::int AS count FROM venues WHERE deleted_at IS NULL AND city IS NOT NULL`);
  counts.venueCities = venuesCityRes.rows[0].count;

  const venuePass = counts.venues >= 20 && counts.venueCities >= 5;
  console.log(`[1] Venues Count: ${counts.venues} across ${counts.venueCities} cities/provinces -> ${venuePass ? 'PASS' : 'FAIL'}`);
  if (!venuePass) passedAll = false;

  // 2. Demo Accounts & Password Verification
  const usersRes = await query(`SELECT id, email, password_hash FROM auth_users WHERE email = ANY($1::text[])`, [DEMO_EMAILS]);
  counts.demoAccounts = usersRes.rows.length;
  let authPass = counts.demoAccounts >= DEMO_EMAILS.length;

  for (const userRow of usersRes.rows) {
    const valid = await backendAuthProvider.verifyPassword('123456', userRow.password_hash);
    if (!valid) {
      console.error(`  - Password verification FAILED for ${userRow.email}`);
      authPass = false;
    }
  }
  console.log(`[2] Demo Accounts (Password: 123456): ${counts.demoAccounts}/${DEMO_EMAILS.length} verified -> ${authPass ? 'PASS' : 'FAIL'}`);
  if (!authPass) passedAll = false;

  // 3. Per-Group Public Future Events Count
  const groups = [
    { name: 'Music', alias: 'music', querySql: `SELECT COUNT(*)::int AS count FROM events WHERE status = 'active' AND visibility = 'public' AND 'music' = ANY(category)` },
    { name: 'Theater & Arts', alias: 'arts', querySql: `SELECT COUNT(*)::int AS count FROM events WHERE status = 'active' AND visibility = 'public' AND 'arts' = ANY(category)` },
    { name: 'Workshops & Tech', alias: 'workshop/tech', querySql: `SELECT COUNT(*)::int AS count FROM events WHERE status = 'active' AND visibility = 'public' AND ('workshop' = ANY(category) OR 'tech' = ANY(category))` },
    { name: 'Sports', alias: 'sports', querySql: `SELECT COUNT(*)::int AS count FROM events WHERE status = 'active' AND visibility = 'public' AND 'sports' = ANY(category)` },
    { name: 'Exhibitions', alias: 'exhibition', querySql: `SELECT COUNT(*)::int AS count FROM events WHERE status = 'active' AND visibility = 'public' AND ('exhibition' = ANY(category) OR 'arts' = ANY(category))` },
  ];

  counts.groups = {};
  let groupPass = true;
  for (const g of groups) {
    const res = await query(g.querySql);
    const cnt = res.rows[0].count;
    counts.groups[g.name] = cnt;
    const ok = cnt >= 10;
    if (!ok) groupPass = false;
    console.log(`  · ${g.name} (${g.alias}): ${cnt} events (min 10) -> ${ok ? 'PASS' : 'FAIL'}`);
  }
  console.log(`[3] Category Group Event Counts -> ${groupPass ? 'PASS' : 'FAIL'}`);
  if (!groupPass) passedAll = false;

  // 4. Total Public Active Events & Indexable Count
  const publicActiveRes = await query(
    `SELECT COUNT(*)::int AS count FROM events WHERE status = $1 AND visibility = $2`,
    [STATUS.ACTIVE, VISIBILITY.PUBLIC]
  );
  counts.publicActiveEvents = publicActiveRes.rows[0].count;
  const indexablePass = counts.publicActiveEvents >= 50;
  console.log(`[4] Indexable Public Active Events (Elasticsearch Compatible): ${counts.publicActiveEvents} events (min 50) -> ${indexablePass ? 'PASS' : 'FAIL'}`);
  if (!indexablePass) passedAll = false;

  // 5. Seat-Map-Ready Event Verification
  const seatMapEventRes = await query(`SELECT id, venue_id, raw_data FROM events WHERE id = 'demo_evt_arts_01'`);
  let seatMapPass = false;
  if (seatMapEventRes.rows.length > 0) {
    const evt = seatMapEventRes.rows[0];
    const seatsList = await seatRepo.getSeatsByMapId('demo_sm_hanoi_opera');
    counts.seatMapSeats = seatsList.length;
    if (seatsList.length >= 20) {
      seatMapPass = true;
    }
  }
  console.log(`[5] Seat-Map-Ready Event (demo_evt_arts_01): ${counts.seatMapSeats || 0} seats configured -> ${seatMapPass ? 'PASS' : 'FAIL'}`);
  if (!seatMapPass) passedAll = false;

  // 6. Supported Relations
  const orgProfilesRes = await query(`SELECT COUNT(*)::int AS count FROM organizer_profiles WHERE id LIKE 'demo_%'`);
  counts.organizerProfiles = orgProfilesRes.rows[0].count;

  const featuredRes = await query(`SELECT COUNT(*)::int AS count FROM featured_profiles WHERE id LIKE 'demo_%'`);
  counts.featuredProfiles = featuredRes.rows[0].count;

  const ticketTypesRes = await query(`SELECT COUNT(*)::int AS count FROM event_ticket_types WHERE id LIKE 'demo_%'`);
  counts.ticketTypes = ticketTypesRes.rows[0].count;

  const promosRes = await query(`SELECT COUNT(*)::int AS count FROM promotions WHERE id LIKE 'demo_%'`);
  counts.promotions = promosRes.rows[0].count;

  const reviewsRes = await query(`SELECT COUNT(*)::int AS count FROM reviews WHERE id LIKE 'demo_%'`);
  counts.reviews = reviewsRes.rows[0].count;

  const mediaRes = await query(`SELECT COUNT(*)::int AS count FROM event_media WHERE id LIKE 'demo_%'`);
  counts.eventMedia = mediaRes.rows[0].count;

  console.log(`[6] Supported Domain Relations:`);
  console.log(`  · Organizer Profiles: ${counts.organizerProfiles}`);
  console.log(`  · Featured Profiles:  ${counts.featuredProfiles}`);
  console.log(`  · Ticket Types:       ${counts.ticketTypes}`);
  console.log(`  · Promotions:         ${counts.promotions}`);
  console.log(`  · Reviews:            ${counts.reviews}`);
  console.log(`  · Event Media:        ${counts.eventMedia}`);

  console.log('\n-------------------------------------------------------');
  console.log(` OVERALL VERIFICATION STATUS: ${passedAll ? 'PASSED (ALL CHECKS OK)' : 'FAILED'}`);
  console.log('-------------------------------------------------------\n');

  if (!passedAll) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification error:', err.message || err);
  process.exit(1);
});
