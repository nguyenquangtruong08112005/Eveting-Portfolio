-- Migration: 049_ticket_check_ins
-- W1: check-in events as first-class rows (god-table split).

CREATE TABLE IF NOT EXISTS ticket_check_ins (
  id            TEXT PRIMARY KEY,
  ticket_id     TEXT NOT NULL,
  event_id      TEXT NOT NULL,
  staff_user_id TEXT,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source        TEXT NOT NULL DEFAULT 'qr',
  raw_data      JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ticket_check_ins_ticket_id ON ticket_check_ins (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_check_ins_event_id ON ticket_check_ins (event_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ticket_check_ins_ticket_id') THEN
    ALTER TABLE ticket_check_ins
      ADD CONSTRAINT fk_ticket_check_ins_ticket_id
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ticket_check_ins_event_id') THEN
    ALTER TABLE ticket_check_ins
      ADD CONSTRAINT fk_ticket_check_ins_event_id
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ticket_check_ins_staff_user_id') THEN
    ALTER TABLE ticket_check_ins
      ADD CONSTRAINT fk_ticket_check_ins_staff_user_id
      FOREIGN KEY (staff_user_id) REFERENCES auth_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Keep tickets.check_in_count as cache; optional future drop of last_check_in_at/checked_in_at
