/**
 * Node runner for orphan checks (no psql required).
 * Usage: node scripts/run-orphan-audit.js
 */
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const checks = [
  ['tickets_missing_event', `SELECT COUNT(*)::int AS n FROM tickets t LEFT JOIN events e ON e.id = t.event_id WHERE e.id IS NULL`],
  ['tickets_missing_user', `SELECT COUNT(*)::int AS n FROM tickets t LEFT JOIN auth_users u ON u.id = t.user_id WHERE u.id IS NULL`],
  ['orders_missing_user', `SELECT COUNT(*)::int AS n FROM orders o LEFT JOIN auth_users u ON u.id = o.user_id WHERE u.id IS NULL`],
  ['reviews_missing_event', `SELECT COUNT(*)::int AS n FROM reviews r LEFT JOIN events e ON e.id = r.event_id WHERE e.id IS NULL`],
  ['user_profiles_missing_auth', `SELECT COUNT(*)::int AS n FROM user_profiles p LEFT JOIN auth_users u ON u.id = p.id WHERE u.id IS NULL`],
  ['events_organizer_missing', `SELECT COUNT(*)::int AS n FROM events e LEFT JOIN auth_users u ON u.id = e.organizer_id WHERE e.organizer_id IS NOT NULL AND u.id IS NULL`],
  ['events_venue_missing', `SELECT COUNT(*)::int AS n FROM events e LEFT JOIN venues v ON v.id = e.venue_id WHERE e.venue_id IS NOT NULL AND v.id IS NULL`],
  ['orders_organizer_missing', `SELECT COUNT(*)::int AS n FROM orders o LEFT JOIN auth_users u ON u.id = o.organizer_id WHERE o.organizer_id IS NOT NULL AND u.id IS NULL`],
  ['tickets_organizer_missing', `SELECT COUNT(*)::int AS n FROM tickets t LEFT JOIN auth_users u ON u.id = t.organizer_id WHERE t.organizer_id IS NOT NULL AND u.id IS NULL`],
  ['tickets_order_item_missing', `SELECT COUNT(*)::int AS n FROM tickets t LEFT JOIN order_items oi ON oi.id = t.order_item_id WHERE t.order_item_id IS NOT NULL AND oi.id IS NULL`],
  ['tickets_payment_attempt_missing', `SELECT COUNT(*)::int AS n FROM tickets t LEFT JOIN payment_attempts p ON p.id = t.payment_attempt_id WHERE t.payment_attempt_id IS NOT NULL AND p.id IS NULL`],
  ['promotions_event_missing', `SELECT COUNT(*)::int AS n FROM promotions pr LEFT JOIN events e ON e.id = pr.event_id WHERE pr.event_id IS NOT NULL AND e.id IS NULL`],
  ['promotions_organizer_missing', `SELECT COUNT(*)::int AS n FROM promotions pr LEFT JOIN auth_users u ON u.id = pr.organizer_id WHERE pr.organizer_id IS NOT NULL AND u.id IS NULL`],
  ['analytics_event_missing', `SELECT COUNT(*)::int AS n FROM analytics a LEFT JOIN events e ON e.id = a.event_id WHERE e.id IS NULL`],
  ['featured_owner_missing', `SELECT COUNT(*)::int AS n FROM featured_profiles f LEFT JOIN auth_users u ON u.id = f.owner_user_id WHERE f.owner_user_id IS NOT NULL AND u.id IS NULL`],
  ['organizer_profiles_user_missing', `SELECT COUNT(*)::int AS n FROM organizer_profiles op LEFT JOIN auth_users u ON u.id = op.user_id WHERE u.id IS NULL`],
  ['organizer_settings_missing', `SELECT COUNT(*)::int AS n FROM organizer_settings s LEFT JOIN auth_users u ON u.id = s.organizer_id WHERE u.id IS NULL`],
  ['organizer_balances_missing', `SELECT COUNT(*)::int AS n FROM organizer_balances b LEFT JOIN auth_users u ON u.id = b.organizer_id WHERE u.id IS NULL`],
  ['ledger_organizer_missing', `SELECT COUNT(*)::int AS n FROM ledger_entries l LEFT JOIN auth_users u ON u.id = l.organizer_id WHERE u.id IS NULL`],
  ['seat_holds_user_missing', `SELECT COUNT(*)::int AS n FROM seat_holds s LEFT JOIN auth_users u ON u.id = s.user_id WHERE s.user_id IS NOT NULL AND u.id IS NULL`],
  ['order_items_seat_missing', `SELECT COUNT(*)::int AS n FROM order_items oi LEFT JOIN seats s ON s.id = oi.seat_id WHERE oi.seat_id IS NOT NULL AND s.id IS NULL`],
  ['audit_logs_user_missing', `SELECT COUNT(*)::int AS n FROM audit_logs a LEFT JOIN auth_users u ON u.id = a.user_id WHERE a.user_id IS NOT NULL AND u.id IS NULL`],
  ['auth_tokens_user_missing', `SELECT COUNT(*)::int AS n FROM auth_tokens t LEFT JOIN auth_users u ON u.id = t.user_id WHERE t.user_id IS NOT NULL AND u.id IS NULL`],
];

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let bad = 0;
  try {
    console.log('=== Orphan audit ===');
    for (const [name, sql] of checks) {
      const r = await pool.query(sql);
      const n = r.rows[0].n;
      if (n > 0) bad += 1;
      console.log(`${n === 0 ? 'OK' : 'FAIL'} ${name}=${n}`);
    }
    console.log(bad === 0 ? 'ALL CLEAR' : `ISSUES=${bad}`);
    process.exit(bad === 0 ? 0 : 2);
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
