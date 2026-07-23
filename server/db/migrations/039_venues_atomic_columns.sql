-- Migration: 039_venues_atomic_columns
-- Description: 3NF N3 — promote common venue attributes out of JSONB bag.
-- Keep data JSONB as extension bag. Empty-dev: no backfill required.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'VN';
ALTER TABLE venues ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS capacity INT;

CREATE INDEX IF NOT EXISTS idx_venues_city ON venues (city);

-- min_price remains on events as denormalized cache; app recomputes from event_ticket_types.
