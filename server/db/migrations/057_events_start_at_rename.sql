-- Migration: 057_events_start_at_rename
-- W5: rename events.date -> start_at, end_date -> end_at

ALTER TABLE events RENAME COLUMN date TO start_at;
ALTER TABLE events RENAME COLUMN end_date TO end_at;

DROP INDEX IF EXISTS idx_events_date;
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events (start_at);

DROP INDEX IF EXISTS idx_events_lifecycle_visibility_date;
CREATE INDEX IF NOT EXISTS idx_events_lifecycle_visibility_start
  ON events (lifecycle_status, visibility, start_at);
