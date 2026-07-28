-- Migration: 072_link_performance_seat_holds
-- Phase 06: auditable performance hold groups and ticket linkage.

ALTER TABLE seat_holds
    ADD COLUMN IF NOT EXISTS performance_id TEXT,
    ADD COLUMN IF NOT EXISTS performance_seat_id TEXT,
    ADD COLUMN IF NOT EXISTS hold_token TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

ALTER TABLE tickets
    ADD COLUMN IF NOT EXISTS performance_id TEXT,
    ADD COLUMN IF NOT EXISTS performance_seat_id TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_seat_holds_performance_id') THEN
        ALTER TABLE seat_holds
            ADD CONSTRAINT fk_seat_holds_performance_id
            FOREIGN KEY (performance_id) REFERENCES performances(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_seat_holds_performance_seat_id') THEN
        ALTER TABLE seat_holds
            ADD CONSTRAINT fk_seat_holds_performance_seat_id
            FOREIGN KEY (performance_seat_id) REFERENCES performance_seats(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_performance_id') THEN
        ALTER TABLE tickets
            ADD CONSTRAINT fk_tickets_performance_id
            FOREIGN KEY (performance_id) REFERENCES performances(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tickets_performance_seat_id') THEN
        ALTER TABLE tickets
            ADD CONSTRAINT fk_tickets_performance_seat_id
            FOREIGN KEY (performance_seat_id) REFERENCES performance_seats(id) ON DELETE SET NULL;
    END IF;
END $$;

UPDATE seat_holds sh
SET
    performance_id = p.id,
    performance_seat_id = ps.id,
    hold_token = COALESCE(sh.hold_token, sh.id),
    updated_at = COALESCE(sh.updated_at, sh.created_at)
FROM performances p
JOIN performance_seats ps ON ps.performance_id = p.id
WHERE p.event_id = sh.event_id
  AND p.is_default = true
  AND ps.seat_id = sh.seat_id
  AND sh.performance_id IS NULL;

UPDATE tickets t
SET
    performance_id = p.id,
    performance_seat_id = ps.id
FROM performances p
JOIN performance_seats ps ON ps.performance_id = p.id
WHERE p.event_id = t.event_id
  AND p.is_default = true
  AND ps.seat_id = t.seat
  AND t.performance_id IS NULL;

DROP INDEX IF EXISTS idx_active_seat_holds;

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_legacy_seat_holds
    ON seat_holds (event_id, seat_id)
    WHERE status = 'held' AND performance_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_active_performance_seat_holds
    ON seat_holds (performance_seat_id)
    WHERE status = 'held' AND performance_seat_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_seat_holds_hold_token
    ON seat_holds (hold_token)
    WHERE hold_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_seat_holds_expiry_worker
    ON seat_holds (expires_at)
    WHERE status = 'held';

CREATE INDEX IF NOT EXISTS idx_tickets_performance_id
    ON tickets (performance_id);

CREATE INDEX IF NOT EXISTS idx_tickets_performance_seat_id
    ON tickets (performance_seat_id);
