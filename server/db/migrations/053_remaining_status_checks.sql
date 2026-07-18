-- Migration: 053_remaining_status_checks
-- W3: remaining domain CHECKs

UPDATE user_profiles
SET level = 'bronze'
WHERE level IS NULL OR level NOT IN ('bronze','silver','gold','platinum');

UPDATE seat_holds
SET status = 'held'
WHERE status IS NOT NULL AND status NOT IN ('held','released','expired','converted','cancelled');

UPDATE seats
SET status = 'available'
WHERE status IS NOT NULL AND status NOT IN ('available','held','sold','blocked');

UPDATE outbox
SET status = 'pending'
WHERE status IS NULL OR status NOT IN ('pending','processing','completed','failed');

UPDATE event_ticket_types SET available = 0 WHERE available < 0;
UPDATE event_ticket_types SET capacity = 0 WHERE capacity < 0;
UPDATE event_ticket_types SET sold_count = 0 WHERE sold_count < 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_seat_holds_status') THEN
    ALTER TABLE seat_holds ADD CONSTRAINT chk_seat_holds_status
      CHECK (status IS NULL OR status IN ('held','released','expired','converted','cancelled'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_seats_status') THEN
    ALTER TABLE seats ADD CONSTRAINT chk_seats_status
      CHECK (status IS NULL OR status IN ('available','held','sold','blocked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_outbox_status') THEN
    ALTER TABLE outbox ADD CONSTRAINT chk_outbox_status
      CHECK (status IN ('pending','processing','completed','failed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_event_ticket_types_available') THEN
    ALTER TABLE event_ticket_types ADD CONSTRAINT chk_event_ticket_types_available
      CHECK (available >= 0 AND capacity >= 0 AND sold_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_profiles_level') THEN
    ALTER TABLE user_profiles ADD CONSTRAINT chk_user_profiles_level
      CHECK (level IS NULL OR level IN ('bronze','silver','gold','platinum'));
  END IF;
END $$;
