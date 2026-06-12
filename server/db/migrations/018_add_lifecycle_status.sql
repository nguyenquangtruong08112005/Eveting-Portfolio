-- Migration: 018_add_lifecycle_status
-- Description: Add lifecycle_status column to events table for canonical lifecycle tracking.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT DEFAULT NULL;

-- Backfill existing rows: pending -> submitted, active -> published,
-- rejected -> rejected, cancelled -> cancelled
UPDATE events
SET lifecycle_status = CASE
    WHEN status = 'pending'   THEN 'submitted'
    WHEN status = 'active'    THEN 'published'
    WHEN status = 'rejected'  THEN 'rejected'
    WHEN status = 'cancelled' THEN 'cancelled'
END
WHERE lifecycle_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_events_lifecycle_status ON events (lifecycle_status);
