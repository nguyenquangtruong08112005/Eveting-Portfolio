-- Migration 076: Event traffic analytics and organizer check-in reporting.

CREATE TABLE IF NOT EXISTS event_traffic_logs (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    visitor_key TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'direct'
        CHECK (source IN ('direct', 'facebook', 'zalo', 'google', 'referral', 'other')),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    converted_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_event_traffic_event_time
    ON event_traffic_logs (event_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_traffic_event_source
    ON event_traffic_logs (event_id, source);
CREATE INDEX IF NOT EXISTS idx_event_traffic_event_visitor
    ON event_traffic_logs (event_id, visitor_key);

ALTER TABLE ticket_check_ins
    ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'entry',
    ADD COLUMN IF NOT EXISTS performance_id TEXT,
    ADD COLUMN IF NOT EXISTS ticket_type_id TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_ticket_check_ins_direction'
    ) THEN
        ALTER TABLE ticket_check_ins
            ADD CONSTRAINT chk_ticket_check_ins_direction
            CHECK (direction IN ('entry', 'exit'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ticket_check_ins_event_direction_time
    ON ticket_check_ins (event_id, direction, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_check_ins_staff_time
    ON ticket_check_ins (staff_user_id, checked_in_at DESC);
