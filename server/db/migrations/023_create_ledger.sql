-- Migration: 023_create_ledger
-- Description: Create platform fee configuration and ledger tables.

CREATE TABLE IF NOT EXISTS organizer_settings (
    organizer_id TEXT PRIMARY KEY,
    platform_fee_rate NUMERIC DEFAULT 0.05, -- Dynamic fee per organizer (default 5%)
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    organizer_id TEXT NOT NULL,
    gross_amount NUMERIC NOT NULL,
    platform_fee NUMERIC NOT NULL,
    net_amount NUMERIC NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_organizer ON ledger_entries (organizer_id);
