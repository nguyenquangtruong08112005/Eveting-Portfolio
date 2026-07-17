require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

const checks = [
  ['events.organizer_missing_user', `SELECT COUNT(*)::int AS n FROM events e LEFT JOIN auth_users u ON u.id = e.organizer_id WHERE e.organizer_id IS NOT NULL AND u.id IS NULL`],
  ['events.venue_missing', `SELECT COUNT(*)::int AS n FROM events e LEFT JOIN venues v ON v.id = e.venue_id WHERE e.venue_id IS NOT NULL AND v.id IS NULL`],
  ['orders.organizer_missing', `SELECT COUNT(*)::int AS n FROM orders o LEFT JOIN auth_users u ON u.id = o.organizer_id WHERE o.organizer_id IS NOT NULL AND u.id IS NULL`],
  ['tickets.organizer_missing', `SELECT COUNT(*)::int AS n FROM tickets t LEFT JOIN auth_users u ON u.id = t.organizer_id WHERE t.organizer_id IS NOT NULL AND u.id IS NULL`],
  ['tickets.order_item_missing', `SELECT COUNT(*)::int AS n FROM tickets t LEFT JOIN order_items oi ON oi.id = t.order_item_id WHERE t.order_item_id IS NOT NULL AND oi.id IS NULL`],
  ['tickets.payment_attempt_missing', `SELECT COUNT(*)::int AS n FROM tickets t LEFT JOIN payment_attempts p ON p.id = t.payment_attempt_id WHERE t.payment_attempt_id IS NOT NULL AND p.id IS NULL`],
  ['promotions.event_missing', `SELECT COUNT(*)::int AS n FROM promotions pr LEFT JOIN events e ON e.id = pr.event_id WHERE pr.event_id IS NOT NULL AND e.id IS NULL`],
  ['promotions.organizer_missing', `SELECT COUNT(*)::int AS n FROM promotions pr LEFT JOIN auth_users u ON u.id = pr.organizer_id WHERE pr.organizer_id IS NOT NULL AND u.id IS NULL`],
  ['analytics.event_missing', `SELECT COUNT(*)::int AS n FROM analytics a LEFT JOIN events e ON e.id = a.event_id WHERE e.id IS NULL`],
  ['featured.owner_missing', `SELECT COUNT(*)::int AS n FROM featured_profiles f LEFT JOIN auth_users u ON u.id = f.owner_user_id WHERE f.owner_user_id IS NOT NULL AND u.id IS NULL`],
  ['organizer_profiles.user_missing', `SELECT COUNT(*)::int AS n FROM organizer_profiles op LEFT JOIN auth_users u ON u.id = op.user_id WHERE u.id IS NULL`],
  ['organizer_settings.missing', `SELECT COUNT(*)::int AS n FROM organizer_settings s LEFT JOIN auth_users u ON u.id = s.organizer_id WHERE u.id IS NULL`],
  ['organizer_balances.missing', `SELECT COUNT(*)::int AS n FROM organizer_balances b LEFT JOIN auth_users u ON u.id = b.organizer_id WHERE u.id IS NULL`],
  ['ledger.organizer_missing', `SELECT COUNT(*)::int AS n FROM ledger_entries l LEFT JOIN auth_users u ON u.id = l.organizer_id WHERE u.id IS NULL`],
  ['seat_holds.user_missing', `SELECT COUNT(*)::int AS n FROM seat_holds s LEFT JOIN auth_users u ON u.id = s.user_id WHERE s.user_id IS NOT NULL AND u.id IS NULL`],
  ['order_items.seat_missing', `SELECT COUNT(*)::int AS n FROM order_items oi LEFT JOIN seats s ON s.id = oi.seat_id WHERE oi.seat_id IS NOT NULL AND s.id IS NULL`],
];

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const cols = await pool.query(`
      SELECT table_name, column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'events' AND column_name IN ('organizer_id','venue_id'))
          OR (table_name = 'orders' AND column_name = 'organizer_id')
          OR (table_name = 'tickets' AND column_name IN ('organizer_id','order_item_id','payment_attempt_id'))
          OR (table_name = 'promotions' AND column_name IN ('event_id','organizer_id'))
          OR (table_name = 'analytics' AND column_name = 'event_id')
          OR (table_name = 'featured_profiles' AND column_name = 'owner_user_id')
          OR (table_name = 'organizer_profiles' AND column_name = 'user_id')
          OR (table_name = 'organizer_settings' AND column_name = 'organizer_id')
          OR (table_name = 'organizer_balances' AND column_name = 'organizer_id')
          OR (table_name = 'ledger_entries' AND column_name = 'organizer_id')
          OR (table_name = 'seat_holds' AND column_name = 'user_id')
          OR (table_name = 'order_items' AND column_name = 'seat_id')
        )
      ORDER BY 1,2`);
    cols.rows.forEach((r) => console.log(`COL|${r.table_name}.${r.column_name}|null=${r.is_nullable}`));
    for (const [name, sql] of checks) {
      const r = await pool.query(sql);
      console.log(`ORPHAN|${name}|${r.rows[0].n}`);
    }
  } finally {
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
