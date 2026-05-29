-- Migration: 011_create_tickets
-- Description: PostgreSQL schema for tickets.

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    organizer_id TEXT,
    type TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    original_price NUMERIC DEFAULT 0,
    quantity INT DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    applied_promo_code TEXT,
    seat TEXT,
    qr_code TEXT,
    status TEXT DEFAULT 'pending',
    purchase_date BIGINT,
    group_id TEXT,
    check_in_count INT DEFAULT 0,
    last_check_in_at BIGINT,
    checked_in_at BIGINT,
    payment_time BIGINT,
    updated_at BIGINT,
    raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets (event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
