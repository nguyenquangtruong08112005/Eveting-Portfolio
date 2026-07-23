-- Migration: 034_core_status_check_constraints
-- Description: DBA-3 — domain CHECKs for core status / rating columns.
--              Allows legacy + canonical event statuses used by app.
-- Dependency: 033 domain FKs
-- Rollback: DROP CONSTRAINT chk_* below

-- Normalize any unexpected status to a safe known value before CHECK
UPDATE events SET status = 'pending' WHERE status IS NULL OR status = '';
UPDATE events SET visibility = 'private' WHERE visibility IS NULL OR visibility = '';
UPDATE orders SET status = 'pending_payment' WHERE status IS NULL OR status = '';
UPDATE tickets SET status = 'pending' WHERE status IS NULL OR status = '';
UPDATE payment_attempts SET status = 'pending' WHERE status IS NULL OR status = '';

-- Map unknown event statuses to pending (preserve known set)
UPDATE events
SET status = 'pending'
WHERE status NOT IN (
  'draft', 'submitted', 'approved', 'published', 'rejected', 'cancelled',
  'pending', 'active'
);

UPDATE events
SET visibility = 'private'
WHERE visibility NOT IN ('public', 'private', 'unlisted');

UPDATE orders
SET status = 'pending_payment'
WHERE status NOT IN ('pending_payment', 'paid', 'cancelled', 'expired', 'failed');

UPDATE tickets
SET status = 'pending'
WHERE status NOT IN (
  'pending', 'paid', 'checkedIn', 'checked_in', 'cancelled', 'active', 'refunded'
);

UPDATE payment_attempts
SET status = 'pending'
WHERE status NOT IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled');

-- Rating sanity for reviews
UPDATE reviews SET rating = 1 WHERE rating IS NOT NULL AND rating < 1;
UPDATE reviews SET rating = 5 WHERE rating IS NOT NULL AND rating > 5;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_events_status') THEN
    ALTER TABLE events
      ADD CONSTRAINT chk_events_status
      CHECK (status IN (
        'draft', 'submitted', 'approved', 'published', 'rejected', 'cancelled',
        'pending', 'active'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_events_visibility') THEN
    ALTER TABLE events
      ADD CONSTRAINT chk_events_visibility
      CHECK (visibility IN ('public', 'private', 'unlisted'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_status') THEN
    ALTER TABLE orders
      ADD CONSTRAINT chk_orders_status
      CHECK (status IN ('pending_payment', 'paid', 'cancelled', 'expired', 'failed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_tickets_status') THEN
    ALTER TABLE tickets
      ADD CONSTRAINT chk_tickets_status
      CHECK (status IN (
        'pending', 'paid', 'checkedIn', 'checked_in', 'cancelled', 'active', 'refunded'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payment_attempts_status') THEN
    ALTER TABLE payment_attempts
      ADD CONSTRAINT chk_payment_attempts_status
      CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reviews_rating') THEN
    ALTER TABLE reviews
      ADD CONSTRAINT chk_reviews_rating
      CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
  END IF;
END $$;
