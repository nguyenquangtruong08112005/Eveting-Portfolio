-- Migration: 033_add_remaining_domain_fks
-- Description: DBA-2 — remaining Tier A foreign keys for ERD integrity.
--              Cleans orphans first (demo/portfolio safety), then adds FKs.
-- Dependency: 031 commerce FKs applied.
-- Rollback: DROP CONSTRAINT for each fk_* added below.

-- ---------------------------------------------------------------------------
-- 1) Orphan cleanup
-- ---------------------------------------------------------------------------

-- events: optional organizer / venue → null bad refs
UPDATE events e
SET organizer_id = NULL
WHERE e.organizer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = e.organizer_id);

UPDATE events e
SET venue_id = NULL
WHERE e.venue_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM venues v WHERE v.id = e.venue_id);

-- orders / tickets organizer optional
UPDATE orders o
SET organizer_id = NULL
WHERE o.organizer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = o.organizer_id);

UPDATE tickets t
SET organizer_id = NULL
WHERE t.organizer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = t.organizer_id);

UPDATE tickets t
SET order_item_id = NULL
WHERE t.order_item_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.id = t.order_item_id);

UPDATE tickets t
SET payment_attempt_id = NULL
WHERE t.payment_attempt_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM payment_attempts p WHERE p.id = t.payment_attempt_id);

-- promotions
UPDATE promotions pr
SET event_id = NULL
WHERE pr.event_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM events e WHERE e.id = pr.event_id);

DELETE FROM promotions pr
WHERE pr.organizer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = pr.organizer_id);

-- analytics (event_id NOT NULL) — drop rows for missing events
DELETE FROM analytics a
WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = a.event_id);

-- featured profiles
UPDATE featured_profiles f
SET owner_user_id = NULL
WHERE f.owner_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = f.owner_user_id);

-- organizer_profiles (user_id NOT NULL)
DELETE FROM organizer_profiles op
WHERE NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = op.user_id);

-- finance tables (organizer_id NOT NULL)
DELETE FROM organizer_settings s
WHERE NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = s.organizer_id);

DELETE FROM organizer_balances b
WHERE NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = b.organizer_id);

DELETE FROM ledger_entries l
WHERE NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = l.organizer_id);

-- seat holds (user_id NOT NULL)
DELETE FROM seat_holds s
WHERE s.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = s.user_id);

-- order_items.seat_id optional
UPDATE order_items oi
SET seat_id = NULL
WHERE oi.seat_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM seats s WHERE s.id = oi.seat_id);

-- ---------------------------------------------------------------------------
-- 2) Add foreign keys (idempotent)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_events_organizer_id') THEN
    ALTER TABLE events
      ADD CONSTRAINT fk_events_organizer_id
      FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_events_venue_id') THEN
    ALTER TABLE events
      ADD CONSTRAINT fk_events_venue_id
      FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_organizer_id') THEN
    ALTER TABLE orders
      ADD CONSTRAINT fk_orders_organizer_id
      FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_organizer_id') THEN
    ALTER TABLE tickets
      ADD CONSTRAINT fk_tickets_organizer_id
      FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_order_item_id') THEN
    ALTER TABLE tickets
      ADD CONSTRAINT fk_tickets_order_item_id
      FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_payment_attempt_id') THEN
    ALTER TABLE tickets
      ADD CONSTRAINT fk_tickets_payment_attempt_id
      FOREIGN KEY (payment_attempt_id) REFERENCES payment_attempts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_promotions_event_id') THEN
    ALTER TABLE promotions
      ADD CONSTRAINT fk_promotions_event_id
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_promotions_organizer_id') THEN
    ALTER TABLE promotions
      ADD CONSTRAINT fk_promotions_organizer_id
      FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_analytics_event_id') THEN
    ALTER TABLE analytics
      ADD CONSTRAINT fk_analytics_event_id
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_featured_profiles_owner_user_id') THEN
    ALTER TABLE featured_profiles
      ADD CONSTRAINT fk_featured_profiles_owner_user_id
      FOREIGN KEY (owner_user_id) REFERENCES auth_users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_organizer_profiles_user_id') THEN
    ALTER TABLE organizer_profiles
      ADD CONSTRAINT fk_organizer_profiles_user_id
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_organizer_settings_organizer_id') THEN
    ALTER TABLE organizer_settings
      ADD CONSTRAINT fk_organizer_settings_organizer_id
      FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_organizer_balances_organizer_id') THEN
    ALTER TABLE organizer_balances
      ADD CONSTRAINT fk_organizer_balances_organizer_id
      FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ledger_entries_organizer_id') THEN
    ALTER TABLE ledger_entries
      ADD CONSTRAINT fk_ledger_entries_organizer_id
      FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_seat_holds_user_id') THEN
    ALTER TABLE seat_holds
      ADD CONSTRAINT fk_seat_holds_user_id
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_seat_id') THEN
    ALTER TABLE order_items
      ADD CONSTRAINT fk_order_items_seat_id
      FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE SET NULL;
  END IF;
END $$;
