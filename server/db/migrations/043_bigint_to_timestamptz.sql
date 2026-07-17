-- Migration: 043_bigint_to_timestamptz
-- Description: Convert epoch-millis BIGINT time columns to TIMESTAMPTZ.
-- Empty-dev: USING to_timestamp(ms/1000). Event schedule dates included.

-- Helper: convert bigint epoch ms → timestamptz (null-safe)
-- We apply per-column ALTER … TYPE … USING

DO $$
DECLARE
  rec RECORD;
  stmts TEXT[] := ARRAY[
    -- events
    'ALTER TABLE events ALTER COLUMN date TYPE TIMESTAMPTZ USING CASE WHEN date IS NULL THEN NULL ELSE to_timestamp(date/1000.0) END',
    'ALTER TABLE events ALTER COLUMN end_date TYPE TIMESTAMPTZ USING CASE WHEN end_date IS NULL THEN NULL ELSE to_timestamp(end_date/1000.0) END',
    'ALTER TABLE events ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE events ALTER COLUMN last_updated_at TYPE TIMESTAMPTZ USING CASE WHEN last_updated_at IS NULL THEN NULL ELSE to_timestamp(last_updated_at/1000.0) END',
    -- tickets
    'ALTER TABLE tickets ALTER COLUMN purchase_date TYPE TIMESTAMPTZ USING CASE WHEN purchase_date IS NULL THEN NULL ELSE to_timestamp(purchase_date/1000.0) END',
    'ALTER TABLE tickets ALTER COLUMN payment_time TYPE TIMESTAMPTZ USING CASE WHEN payment_time IS NULL THEN NULL ELSE to_timestamp(payment_time/1000.0) END',
    'ALTER TABLE tickets ALTER COLUMN checked_in_at TYPE TIMESTAMPTZ USING CASE WHEN checked_in_at IS NULL THEN NULL ELSE to_timestamp(checked_in_at/1000.0) END',
    'ALTER TABLE tickets ALTER COLUMN last_check_in_at TYPE TIMESTAMPTZ USING CASE WHEN last_check_in_at IS NULL THEN NULL ELSE to_timestamp(last_check_in_at/1000.0) END',
    'ALTER TABLE tickets ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING CASE WHEN updated_at IS NULL THEN NULL ELSE to_timestamp(updated_at/1000.0) END',
    -- orders
    'ALTER TABLE orders ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING CASE WHEN expires_at IS NULL THEN NULL ELSE to_timestamp(expires_at/1000.0) END',
    'ALTER TABLE orders ALTER COLUMN paid_at TYPE TIMESTAMPTZ USING CASE WHEN paid_at IS NULL THEN NULL ELSE to_timestamp(paid_at/1000.0) END',
    'ALTER TABLE orders ALTER COLUMN cancelled_at TYPE TIMESTAMPTZ USING CASE WHEN cancelled_at IS NULL THEN NULL ELSE to_timestamp(cancelled_at/1000.0) END',
    'ALTER TABLE orders ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE orders ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING CASE WHEN updated_at IS NULL THEN NULL ELSE to_timestamp(updated_at/1000.0) END',
    'ALTER TABLE order_items ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE payment_attempts ALTER COLUMN completed_at TYPE TIMESTAMPTZ USING CASE WHEN completed_at IS NULL THEN NULL ELSE to_timestamp(completed_at/1000.0) END',
    'ALTER TABLE payment_attempts ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE payment_attempts ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING CASE WHEN updated_at IS NULL THEN NULL ELSE to_timestamp(updated_at/1000.0) END',
    -- engagement
    'ALTER TABLE notifications ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at/1000.0)',
    'ALTER TABLE reviews ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE event_media ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE promotions ALTER COLUMN valid_from TYPE TIMESTAMPTZ USING to_timestamp(valid_from/1000.0)',
    'ALTER TABLE promotions ALTER COLUMN valid_until TYPE TIMESTAMPTZ USING to_timestamp(valid_until/1000.0)',
    'ALTER TABLE promotions ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at/1000.0)',
    -- analytics / finance / seats
    'ALTER TABLE analytics ALTER COLUMN last_updated_at TYPE TIMESTAMPTZ USING CASE WHEN last_updated_at IS NULL THEN NULL ELSE to_timestamp(last_updated_at/1000.0) END',
    'ALTER TABLE ledger_entries ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE organizer_balances ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING CASE WHEN updated_at IS NULL THEN NULL ELSE to_timestamp(updated_at/1000.0) END',
    'ALTER TABLE organizer_settings ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE organizer_profiles ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE platform_fees ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING CASE WHEN updated_at IS NULL THEN NULL ELSE to_timestamp(updated_at/1000.0) END',
    'ALTER TABLE outbox ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at/1000.0)',
    'ALTER TABLE outbox ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING to_timestamp(updated_at/1000.0)',
    'ALTER TABLE idempotency_keys ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at/1000.0)',
    'ALTER TABLE idempotency_keys ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING to_timestamp(expires_at/1000.0)',
    'ALTER TABLE seat_maps ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE seat_sections ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE seats ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE seat_holds ALTER COLUMN held_at TYPE TIMESTAMPTZ USING CASE WHEN held_at IS NULL THEN NULL ELSE to_timestamp(held_at/1000.0) END',
    'ALTER TABLE seat_holds ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING CASE WHEN expires_at IS NULL THEN NULL ELSE to_timestamp(expires_at/1000.0) END',
    'ALTER TABLE seat_holds ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    -- loyalty / profiles / 3NF junctions
    'ALTER TABLE membership_tiers ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE user_memberships ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING CASE WHEN updated_at IS NULL THEN NULL ELSE to_timestamp(updated_at/1000.0) END',
    'ALTER TABLE loyalty_points_ledger ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE user_profiles ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE user_profiles ALTER COLUMN birth_date TYPE TIMESTAMPTZ USING CASE WHEN birth_date IS NULL THEN NULL ELSE to_timestamp(birth_date/1000.0) END',
    'ALTER TABLE audit_logs ALTER COLUMN created_at TYPE TIMESTAMPTZ USING to_timestamp(created_at/1000.0)',
    'ALTER TABLE event_ticket_types ALTER COLUMN sales_start TYPE TIMESTAMPTZ USING CASE WHEN sales_start IS NULL THEN NULL ELSE to_timestamp(sales_start/1000.0) END',
    'ALTER TABLE event_ticket_types ALTER COLUMN sales_end TYPE TIMESTAMPTZ USING CASE WHEN sales_end IS NULL THEN NULL ELSE to_timestamp(sales_end/1000.0) END',
    'ALTER TABLE event_ticket_types ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE event_ticket_types ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING CASE WHEN updated_at IS NULL THEN NULL ELSE to_timestamp(updated_at/1000.0) END',
    'ALTER TABLE user_follows ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE event_featured_profiles ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END',
    'ALTER TABLE user_event_history ALTER COLUMN attended_at TYPE TIMESTAMPTZ USING CASE WHEN attended_at IS NULL THEN NULL ELSE to_timestamp(attended_at/1000.0) END',
    'ALTER TABLE user_devices ALTER COLUMN last_seen_at TYPE TIMESTAMPTZ USING CASE WHEN last_seen_at IS NULL THEN NULL ELSE to_timestamp(last_seen_at/1000.0) END',
    'ALTER TABLE user_devices ALTER COLUMN created_at TYPE TIMESTAMPTZ USING CASE WHEN created_at IS NULL THEN NULL ELSE to_timestamp(created_at/1000.0) END'
  ];
  s TEXT;
BEGIN
  FOREACH s IN ARRAY stmts
  LOOP
    BEGIN
      EXECUTE s;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'skip/fail: % — %', s, SQLERRM;
    END;
  END LOOP;
END $$;

-- Sensible defaults for common audit columns
ALTER TABLE events ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE events ALTER COLUMN last_updated_at SET DEFAULT NOW();
ALTER TABLE orders ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE orders ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE notifications ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE audit_logs ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE outbox ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE outbox ALTER COLUMN updated_at SET DEFAULT NOW();
