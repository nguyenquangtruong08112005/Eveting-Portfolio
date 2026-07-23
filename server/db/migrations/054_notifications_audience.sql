-- Migration: 054_notifications_audience
-- W3: replace user_id='all' with audience discriminator; nullable user_id + FK.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'user';

UPDATE notifications
SET audience = 'broadcast', user_id = NULL
WHERE user_id = 'all';

-- Drop old partition-safe PK issues: user_id may be null for broadcast
-- (partitioned table: alter carefully — empty-dev recreate not required if already null ok)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_notifications_audience') THEN
    ALTER TABLE notifications ADD CONSTRAINT chk_notifications_audience
      CHECK (audience IN ('user','broadcast'));
  END IF;
END $$;

-- FK only for user-targeted rows is not expressible as standard FK with broadcast null.
-- Add FK when user_id not null via trigger validation instead.
CREATE OR REPLACE FUNCTION notifications_validate_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.audience = 'user' THEN
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'user audience requires user_id';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.user_id) THEN
      RAISE EXCEPTION 'notifications.user_id % not in auth_users', NEW.user_id;
    END IF;
  END IF;
  IF NEW.audience = 'broadcast' THEN
    NEW.user_id := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notifications_validate_user ON notifications;
CREATE TRIGGER trg_notifications_validate_user
  BEFORE INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION notifications_validate_user();
