-- Migration: 028_create_balances_and_fees
-- Description: Create organizer_balances and platform_fees tables for tracking net revenue and platform fees.

CREATE TABLE IF NOT EXISTS organizer_balances (
    organizer_id TEXT PRIMARY KEY,
    balance NUMERIC NOT NULL DEFAULT 0.00,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_fees (
    id TEXT PRIMARY KEY, -- 'platform'
    balance NUMERIC NOT NULL DEFAULT 0.00,
    updated_at BIGINT NOT NULL
);

-- Initialize the single platform row to accumulate fees
INSERT INTO platform_fees (id, balance, updated_at)
VALUES ('platform', 0.00, 0)
ON CONFLICT (id) DO NOTHING;
