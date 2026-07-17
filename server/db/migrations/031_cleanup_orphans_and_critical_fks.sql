-- Migration: 031_cleanup_orphans_and_critical_fks
-- Description: Portfolio V1 — remove orphan rows blocking integrity, then add
--              critical foreign keys on core commerce / identity tables.
-- Dependency: tables from 002–019+ must exist; migrate.js runs this in a transaction.
-- Rollback: DROP CONSTRAINT for each fk_* name below (data cleanup is not reversed).
-- Policy: auth_users is identity source of truth; user_profiles.id should equal auth_users.id.
--
-- Delete order matters: child tables with FK to orders (ledger_entries has NO CASCADE)
-- must be cleaned before DELETE FROM orders.

-- ---------------------------------------------------------------------------
-- 1) Orphan cleanup (portfolio / demo safety — deletes unlinked rows)
-- ---------------------------------------------------------------------------

-- tickets with bad event/user first
DELETE FROM tickets t
WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = t.event_id);

DELETE FROM tickets t
WHERE NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = t.user_id);

-- null ticket links to missing parents
UPDATE tickets t
SET order_id = NULL
WHERE t.order_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = t.order_id);

UPDATE tickets t
SET order_item_id = NULL
WHERE t.order_item_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.id = t.order_item_id);

UPDATE tickets t
SET payment_attempt_id = NULL
WHERE t.payment_attempt_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM payment_attempts p WHERE p.id = t.payment_attempt_id);

-- payment_attempts: clear ticket link to deleted tickets
UPDATE payment_attempts p
SET ticket_id = NULL
WHERE p.ticket_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.id = p.ticket_id);

-- order_items: clear ticket/event links
UPDATE order_items oi
SET ticket_id = NULL
WHERE oi.ticket_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM tickets t WHERE t.id = oi.ticket_id);

UPDATE order_items oi
SET event_id = NULL
WHERE oi.event_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = oi.event_id);

-- Identify orphan orders (user missing) once; clean dependents, then orders
-- ledger_entries.order_id → orders(id)  (NO ACTION / no CASCADE)
DELETE FROM ledger_entries le
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = le.order_id
    AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = o.user_id)
);

-- also ledger pointing at already-missing orders
DELETE FROM ledger_entries le
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = le.order_id);

-- payment_attempts / order_items cascade when order deleted IF FK CASCADE exists;
-- delete explicitly for orphan-user orders to be safe across schema variants
DELETE FROM payment_attempts p
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = p.order_id
    AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = o.user_id)
);

DELETE FROM order_items oi
WHERE EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = oi.order_id
    AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = o.user_id)
);

UPDATE tickets t
SET order_id = NULL, order_item_id = NULL, payment_attempt_id = NULL
WHERE t.order_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = t.order_id
      AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = o.user_id)
  );

DELETE FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = o.user_id);

UPDATE orders o
SET event_id = NULL
WHERE o.event_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = o.event_id);

-- reviews
DELETE FROM reviews r
WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = r.event_id);

DELETE FROM reviews r
WHERE NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = r.user_id);

-- user_profiles without auth (identity policy)
-- clear dependents that reference profile id as user_id if needed
DELETE FROM user_profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = p.id);

-- notifications
DELETE FROM notifications n
WHERE NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = n.user_id);

UPDATE notifications n
SET event_id = NULL
WHERE n.event_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = n.event_id);

-- event_media
DELETE FROM event_media m
WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = m.event_id);

DELETE FROM event_media m
WHERE NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = m.user_id);

-- ---------------------------------------------------------------------------
-- 2) Critical foreign keys (idempotent)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  -- tickets
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_event_id') THEN
    ALTER TABLE tickets
      ADD CONSTRAINT fk_tickets_event_id
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_user_id') THEN
    ALTER TABLE tickets
      ADD CONSTRAINT fk_tickets_user_id
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_order_id') THEN
    ALTER TABLE tickets
      ADD CONSTRAINT fk_tickets_order_id
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
  END IF;

  -- orders
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_user_id') THEN
    ALTER TABLE orders
      ADD CONSTRAINT fk_orders_user_id
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_event_id') THEN
    ALTER TABLE orders
      ADD CONSTRAINT fk_orders_event_id
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
  END IF;

  -- order_items
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_event_id') THEN
    ALTER TABLE order_items
      ADD CONSTRAINT fk_order_items_event_id
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_ticket_id') THEN
    ALTER TABLE order_items
      ADD CONSTRAINT fk_order_items_ticket_id
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL;
  END IF;

  -- payment_attempts
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payment_attempts_ticket_id') THEN
    ALTER TABLE payment_attempts
      ADD CONSTRAINT fk_payment_attempts_ticket_id
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL;
  END IF;

  -- reviews
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reviews_event_id') THEN
    ALTER TABLE reviews
      ADD CONSTRAINT fk_reviews_event_id
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reviews_user_id') THEN
    ALTER TABLE reviews
      ADD CONSTRAINT fk_reviews_user_id
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;

  -- identity: profile must belong to auth user
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_profiles_auth_user') THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT fk_user_profiles_auth_user
      FOREIGN KEY (id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;

  -- notifications
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_user_id') THEN
    ALTER TABLE notifications
      ADD CONSTRAINT fk_notifications_user_id
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_event_id') THEN
    ALTER TABLE notifications
      ADD CONSTRAINT fk_notifications_event_id
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
  END IF;

  -- event_media
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_event_media_event_id') THEN
    ALTER TABLE event_media
      ADD CONSTRAINT fk_event_media_event_id
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_event_media_user_id') THEN
    ALTER TABLE event_media
      ADD CONSTRAINT fk_event_media_user_id
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;
END $$;
