/**
 * Targeted Cleanup Script for Fixed Demo Namespace.
 *
 * Removes only demo portfolio data matching fixed prefix `demo_%` or fixed demo account emails.
 * Operates in strict FK-safe order (children -> parents).
 * NEVER drops tables or schemas.
 *
 * Usage (from server/):
 *   node scripts/seed/clean-demo.js
 *   npm run db:seed:clean
 */
require('../../src/alias-bootstrap');
require('dotenv').config({ quiet: true });

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is required for clean-demo.');
  process.exit(1);
}

const { query } = require('@/providers/database/postgres.client');

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

async function tableExists(tableName) {
  const res = await query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1) AS exists`,
    [tableName]
  );
  return res.rows[0]?.exists === true;
}

async function safeDelete(tableName, conditionSql, params = []) {
  const exists = await tableExists(tableName);
  if (!exists) return 0;
  try {
    const res = await query(`DELETE FROM ${tableName} WHERE ${conditionSql}`, params);
    return res.rowCount || 0;
  } catch (err) {
    console.warn(`[clean-demo] Warning deleting from ${tableName}:`, err.message);
    return 0;
  }
}

async function main() {
  console.log('\n=== Cleaning fixed demo namespace (FK-safe order) ===\n');

  let totalDeleted = 0;

  // 1. Event media & reviews
  let count = await safeDelete(
    'event_media',
    `id LIKE 'demo_%' OR user_id LIKE 'demo_%' OR event_id LIKE 'demo_%' OR user_id IN (SELECT id FROM auth_users WHERE email = ANY($1::text[]))`,
    [DEMO_EMAILS]
  );
  console.log(`  · event_media: ${count}`);
  totalDeleted += count;

  count = await safeDelete(
    'reviews',
    `id LIKE 'demo_%' OR user_id LIKE 'demo_%' OR event_id LIKE 'demo_%' OR user_id IN (SELECT id FROM auth_users WHERE email = ANY($1::text[]))`,
    [DEMO_EMAILS]
  );
  console.log(`  · reviews: ${count}`);
  totalDeleted += count;

  // 2. Tickets, Orders, Items, Analytics
  count = await safeDelete(
    'tickets',
    `id LIKE 'demo_%' OR user_id LIKE 'demo_%' OR event_id LIKE 'demo_%' OR user_id IN (SELECT id FROM auth_users WHERE email = ANY($1::text[]))`,
    [DEMO_EMAILS]
  );
  console.log(`  · tickets: ${count}`);
  totalDeleted += count;

  count = await safeDelete(
    'order_items',
    `id LIKE 'demo_%' OR event_id LIKE 'demo_%' OR order_id IN (SELECT id FROM orders WHERE user_id LIKE 'demo_%' OR user_id IN (SELECT id FROM auth_users WHERE email = ANY($1::text[])))`,
    [DEMO_EMAILS]
  );
  console.log(`  · order_items: ${count}`);
  totalDeleted += count;

  count = await safeDelete(
    'orders',
    `id LIKE 'demo_%' OR user_id LIKE 'demo_%' OR user_id IN (SELECT id FROM auth_users WHERE email = ANY($1::text[]))`,
    [DEMO_EMAILS]
  );
  console.log(`  · orders: ${count}`);
  totalDeleted += count;

  count = await safeDelete(
    'analytics',
    `id LIKE 'demo_%' OR event_id LIKE 'demo_%'`
  );
  console.log(`  · analytics: ${count}`);
  totalDeleted += count;

  // 3. Promotions & Notifications
  count = await safeDelete(
    'promotions',
    `id LIKE 'demo_%' OR organizer_id LIKE 'demo_%' OR event_id LIKE 'demo_%' OR organizer_id IN (SELECT id FROM auth_users WHERE email = ANY($1::text[]))`,
    [DEMO_EMAILS]
  );
  console.log(`  · promotions: ${count}`);
  totalDeleted += count;

  count = await safeDelete(
    'notifications',
    `id LIKE 'demo_%' OR user_id LIKE 'demo_%' OR user_id IN (SELECT id FROM auth_users WHERE email = ANY($1::text[]))`,
    [DEMO_EMAILS]
  );
  console.log(`  · notifications: ${count}`);
  totalDeleted += count;

  // 4. Social / Junction tables
  count = await safeDelete(
    'event_featured_profiles',
    `event_id LIKE 'demo_%' OR featured_profile_id LIKE 'demo_%'`
  );
  console.log(`  · event_featured_profiles: ${count}`);
  totalDeleted += count;

  await safeDelete('user_follows', `follower_id LIKE 'demo_%' OR followee_id LIKE 'demo_%'`);
  await safeDelete('user_event_history', `user_id LIKE 'demo_%' OR event_id LIKE 'demo_%'`);
  await safeDelete('user_devices', `user_id LIKE 'demo_%'`);

  // 5. Featured profiles
  count = await safeDelete('featured_profiles', `id LIKE 'demo_%'`);
  console.log(`  · featured_profiles: ${count}`);
  totalDeleted += count;

  // 6. Seat holds, Seats, Seat Sections, Seat Maps
  count = await safeDelete(
    'seat_holds',
    `id LIKE 'demo_%' OR event_id LIKE 'demo_%' OR user_id LIKE 'demo_%'`
  );
  console.log(`  · seat_holds: ${count}`);
  totalDeleted += count;

  count = await safeDelete(
    'seats',
    `id LIKE 'demo_%' OR seat_section_id LIKE 'demo_%' OR seat_section_id IN (SELECT id FROM seat_sections WHERE seat_map_id LIKE 'demo_%')`
  );
  console.log(`  · seats: ${count}`);
  totalDeleted += count;

  count = await safeDelete(
    'seat_sections',
    `id LIKE 'demo_%' OR seat_map_id LIKE 'demo_%'`
  );
  console.log(`  · seat_sections: ${count}`);
  totalDeleted += count;

  count = await safeDelete('seat_maps', `id LIKE 'demo_%'`);
  console.log(`  · seat_maps: ${count}`);
  totalDeleted += count;

  // 7. Event ticket types
  count = await safeDelete(
    'event_ticket_types',
    `id LIKE 'demo_%' OR event_id LIKE 'demo_%'`
  );
  console.log(`  · event_ticket_types: ${count}`);
  totalDeleted += count;

  // 8. Events
  count = await safeDelete('events', `id LIKE 'demo_%'`);
  console.log(`  · events: ${count}`);
  totalDeleted += count;

  // 9. Venues
  count = await safeDelete('venues', `id LIKE 'demo_%'`);
  console.log(`  · venues: ${count}`);
  totalDeleted += count;

  // 10. Organizer profiles
  count = await safeDelete(
    'organizer_profiles',
    `id LIKE 'demo_%' OR user_id LIKE 'demo_%' OR user_id IN (SELECT id FROM auth_users WHERE email = ANY($1::text[]))`,
    [DEMO_EMAILS]
  );
  console.log(`  · organizer_profiles: ${count}`);
  totalDeleted += count;

  // 11. User roles, User profiles, Auth users
  count = await safeDelete(
    'user_roles',
    `user_id LIKE 'demo_%' OR user_id IN (SELECT id FROM auth_users WHERE email = ANY($1::text[]))`,
    [DEMO_EMAILS]
  );
  console.log(`  · user_roles: ${count}`);
  totalDeleted += count;

  count = await safeDelete(
    'user_profiles',
    `id LIKE 'demo_%' OR id IN (SELECT id FROM auth_users WHERE email = ANY($1::text[]))`,
    [DEMO_EMAILS]
  );
  console.log(`  · user_profiles: ${count}`);
  totalDeleted += count;

  count = await safeDelete(
    'auth_users',
    `id LIKE 'demo_%' OR email = ANY($1::text[])`,
    [DEMO_EMAILS]
  );
  console.log(`  · auth_users: ${count}`);
  totalDeleted += count;

  console.log(`\nDemo namespace cleanup finished. Total records removed: ${totalDeleted}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('clean-demo failed:', err.message || err);
  process.exit(1);
});
