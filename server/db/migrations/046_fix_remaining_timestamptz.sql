-- Migration: 046_fix_remaining_timestamptz
-- Convert remaining BIGINT time columns only (skip if already timestamptz).

DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type FROM information_schema.columns
   WHERE table_name = 'user_follows' AND column_name = 'created_at';
  IF col_type = 'bigint' THEN
    ALTER TABLE user_follows ALTER COLUMN created_at DROP DEFAULT;
    ALTER TABLE user_follows ALTER COLUMN created_at TYPE TIMESTAMPTZ
      USING to_timestamp(created_at / 1000.0);
    ALTER TABLE user_follows ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  SELECT data_type INTO col_type FROM information_schema.columns
   WHERE table_name = 'event_featured_profiles' AND column_name = 'created_at';
  IF col_type = 'bigint' THEN
    ALTER TABLE event_featured_profiles ALTER COLUMN created_at DROP DEFAULT;
    ALTER TABLE event_featured_profiles ALTER COLUMN created_at TYPE TIMESTAMPTZ
      USING to_timestamp(created_at / 1000.0);
    ALTER TABLE event_featured_profiles ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  SELECT data_type INTO col_type FROM information_schema.columns
   WHERE table_name = 'user_event_history' AND column_name = 'attended_at';
  IF col_type = 'bigint' THEN
    ALTER TABLE user_event_history ALTER COLUMN attended_at DROP DEFAULT;
    ALTER TABLE user_event_history ALTER COLUMN attended_at TYPE TIMESTAMPTZ
      USING to_timestamp(attended_at / 1000.0);
    ALTER TABLE user_event_history ALTER COLUMN attended_at SET DEFAULT NOW();
  END IF;

  SELECT data_type INTO col_type FROM information_schema.columns
   WHERE table_name = 'user_devices' AND column_name = 'created_at';
  IF col_type = 'bigint' THEN
    ALTER TABLE user_devices ALTER COLUMN created_at DROP DEFAULT;
    ALTER TABLE user_devices ALTER COLUMN created_at TYPE TIMESTAMPTZ
      USING to_timestamp(created_at / 1000.0);
    ALTER TABLE user_devices ALTER COLUMN created_at SET DEFAULT NOW();
  END IF;

  SELECT data_type INTO col_type FROM information_schema.columns
   WHERE table_name = 'user_devices' AND column_name = 'last_seen_at';
  IF col_type = 'bigint' THEN
    ALTER TABLE user_devices ALTER COLUMN last_seen_at TYPE TIMESTAMPTZ
      USING CASE WHEN last_seen_at IS NULL THEN NULL ELSE to_timestamp(last_seen_at / 1000.0) END;
  END IF;
END $$;
