-- Migration: 047_event_lifecycle_sot
-- W1: lifecycle_status is SoT; status is derived projection (kept for API filters).

UPDATE events
SET lifecycle_status = CASE
  WHEN lifecycle_status IS NOT NULL AND lifecycle_status <> '' THEN lifecycle_status
  WHEN status IN ('draft','submitted','approved','published','rejected','cancelled') THEN status
  WHEN status = 'pending' THEN 'submitted'
  WHEN status = 'active' THEN 'published'
  ELSE 'draft'
END
WHERE lifecycle_status IS NULL OR lifecycle_status = '';

UPDATE events
SET status = CASE lifecycle_status
  WHEN 'draft' THEN 'pending'
  WHEN 'submitted' THEN 'pending'
  WHEN 'approved' THEN 'active'
  WHEN 'published' THEN 'active'
  WHEN 'rejected' THEN 'rejected'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE COALESCE(status, 'pending')
END;

ALTER TABLE events ALTER COLUMN lifecycle_status SET DEFAULT 'draft';
ALTER TABLE events ALTER COLUMN lifecycle_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_events_lifecycle_status') THEN
    ALTER TABLE events ADD CONSTRAINT chk_events_lifecycle_status
      CHECK (lifecycle_status IN (
        'draft','submitted','approved','published','rejected','cancelled'
      ));
  END IF;
END $$;

-- Keep status in sync when lifecycle changes (empty-dev safe)
CREATE OR REPLACE FUNCTION events_sync_status_from_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := CASE NEW.lifecycle_status
    WHEN 'draft' THEN 'pending'
    WHEN 'submitted' THEN 'pending'
    WHEN 'approved' THEN 'active'
    WHEN 'published' THEN 'active'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE COALESCE(NEW.status, 'pending')
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_sync_status ON events;
CREATE TRIGGER trg_events_sync_status
  BEFORE INSERT OR UPDATE OF lifecycle_status ON events
  FOR EACH ROW EXECUTE FUNCTION events_sync_status_from_lifecycle();

CREATE INDEX IF NOT EXISTS idx_events_lifecycle_visibility
  ON events (lifecycle_status, visibility);
