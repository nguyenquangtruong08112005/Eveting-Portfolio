-- audit-orphans.sql
-- Full DBA orphan audit (core 031 + Tier A 033).
-- Usage from Server-2025-Eventing:
--   node scripts/run-orphan-audit.js
-- Or: psql $DATABASE_URL -f scripts/audit-orphans.sql

\echo '=== Core (031) ==='

SELECT 'tickets_missing_event' AS check_name, COUNT(*)::int AS cnt
FROM tickets t LEFT JOIN events e ON e.id = t.event_id WHERE e.id IS NULL;

SELECT 'tickets_missing_user' AS check_name, COUNT(*)::int AS cnt
FROM tickets t LEFT JOIN auth_users u ON u.id = t.user_id WHERE u.id IS NULL;

SELECT 'tickets_missing_order' AS check_name, COUNT(*)::int AS cnt
FROM tickets t LEFT JOIN orders o ON o.id = t.order_id
WHERE t.order_id IS NOT NULL AND o.id IS NULL;

SELECT 'orders_missing_user' AS check_name, COUNT(*)::int AS cnt
FROM orders o LEFT JOIN auth_users u ON u.id = o.user_id WHERE u.id IS NULL;

SELECT 'orders_missing_event' AS check_name, COUNT(*)::int AS cnt
FROM orders o LEFT JOIN events e ON e.id = o.event_id
WHERE o.event_id IS NOT NULL AND e.id IS NULL;

SELECT 'reviews_missing_event' AS check_name, COUNT(*)::int AS cnt
FROM reviews r LEFT JOIN events e ON e.id = r.event_id WHERE e.id IS NULL;

SELECT 'reviews_missing_user' AS check_name, COUNT(*)::int AS cnt
FROM reviews r LEFT JOIN auth_users u ON u.id = r.user_id WHERE u.id IS NULL;

SELECT 'user_profiles_missing_auth' AS check_name, COUNT(*)::int AS cnt
FROM user_profiles p LEFT JOIN auth_users u ON u.id = p.id WHERE u.id IS NULL;

SELECT 'notifications_missing_user' AS check_name, COUNT(*)::int AS cnt
FROM notifications n LEFT JOIN auth_users u ON u.id = n.user_id WHERE u.id IS NULL;

SELECT 'event_media_missing_event' AS check_name, COUNT(*)::int AS cnt
FROM event_media m LEFT JOIN events e ON e.id = m.event_id WHERE e.id IS NULL;

\echo '=== Tier A (033) ==='

SELECT 'events_organizer_missing' AS check_name, COUNT(*)::int AS cnt
FROM events e LEFT JOIN auth_users u ON u.id = e.organizer_id
WHERE e.organizer_id IS NOT NULL AND u.id IS NULL;

SELECT 'events_venue_missing' AS check_name, COUNT(*)::int AS cnt
FROM events e LEFT JOIN venues v ON v.id = e.venue_id
WHERE e.venue_id IS NOT NULL AND v.id IS NULL;

SELECT 'orders_organizer_missing' AS check_name, COUNT(*)::int AS cnt
FROM orders o LEFT JOIN auth_users u ON u.id = o.organizer_id
WHERE o.organizer_id IS NOT NULL AND u.id IS NULL;

SELECT 'tickets_organizer_missing' AS check_name, COUNT(*)::int AS cnt
FROM tickets t LEFT JOIN auth_users u ON u.id = t.organizer_id
WHERE t.organizer_id IS NOT NULL AND u.id IS NULL;

SELECT 'tickets_order_item_missing' AS check_name, COUNT(*)::int AS cnt
FROM tickets t LEFT JOIN order_items oi ON oi.id = t.order_item_id
WHERE t.order_item_id IS NOT NULL AND oi.id IS NULL;

SELECT 'tickets_payment_attempt_missing' AS check_name, COUNT(*)::int AS cnt
FROM tickets t LEFT JOIN payment_attempts p ON p.id = t.payment_attempt_id
WHERE t.payment_attempt_id IS NOT NULL AND p.id IS NULL;

SELECT 'promotions_event_missing' AS check_name, COUNT(*)::int AS cnt
FROM promotions pr LEFT JOIN events e ON e.id = pr.event_id
WHERE pr.event_id IS NOT NULL AND e.id IS NULL;

SELECT 'promotions_organizer_missing' AS check_name, COUNT(*)::int AS cnt
FROM promotions pr LEFT JOIN auth_users u ON u.id = pr.organizer_id
WHERE pr.organizer_id IS NOT NULL AND u.id IS NULL;

SELECT 'analytics_event_missing' AS check_name, COUNT(*)::int AS cnt
FROM analytics a LEFT JOIN events e ON e.id = a.event_id WHERE e.id IS NULL;

SELECT 'featured_owner_missing' AS check_name, COUNT(*)::int AS cnt
FROM featured_profiles f LEFT JOIN auth_users u ON u.id = f.owner_user_id
WHERE f.owner_user_id IS NOT NULL AND u.id IS NULL;

SELECT 'organizer_profiles_user_missing' AS check_name, COUNT(*)::int AS cnt
FROM organizer_profiles op LEFT JOIN auth_users u ON u.id = op.user_id WHERE u.id IS NULL;

SELECT 'organizer_settings_missing' AS check_name, COUNT(*)::int AS cnt
FROM organizer_settings s LEFT JOIN auth_users u ON u.id = s.organizer_id WHERE u.id IS NULL;

SELECT 'organizer_balances_missing' AS check_name, COUNT(*)::int AS cnt
FROM organizer_balances b LEFT JOIN auth_users u ON u.id = b.organizer_id WHERE u.id IS NULL;

SELECT 'ledger_organizer_missing' AS check_name, COUNT(*)::int AS cnt
FROM ledger_entries l LEFT JOIN auth_users u ON u.id = l.organizer_id WHERE u.id IS NULL;

SELECT 'seat_holds_user_missing' AS check_name, COUNT(*)::int AS cnt
FROM seat_holds s LEFT JOIN auth_users u ON u.id = s.user_id
WHERE s.user_id IS NOT NULL AND u.id IS NULL;

SELECT 'order_items_seat_missing' AS check_name, COUNT(*)::int AS cnt
FROM order_items oi LEFT JOIN seats s ON s.id = oi.seat_id
WHERE oi.seat_id IS NOT NULL AND s.id IS NULL;

\echo '=== Done (all cnt should be 0 after 033) ==='
