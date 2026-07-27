-- Migration 066: Create payout tables for simulated organizer payouts
-- Additive-only: preserves existing tables, data, and indexes.

CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    organizer_id TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending_provider_submission' CHECK (status IN ('pending_provider_submission', 'pending_admin_approval', 'processing', 'completed', 'failed')),
    admin_approval_reason TEXT,
    keyed_fingerprint TEXT,
    provider_reference TEXT,
    provider_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS payout_items (
    id TEXT PRIMARY KEY,
    payout_id TEXT NOT NULL REFERENCES payouts(id),
    ledger_entry_id TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    organizer_id TEXT PRIMARY KEY,
    encrypted_payload TEXT NOT NULL,
    masked_display TEXT NOT NULL,
    keyed_fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns that may be missing from a prior incomplete migration
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS keyed_fingerprint TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS admin_approval_reason TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS provider_reference TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS provider_message TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

-- Safe FK: payout_items → payouts (only if column does not already have constraint)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_payout_items_payout_id') THEN
    ALTER TABLE payout_items ADD CONSTRAINT fk_payout_items_payout_id FOREIGN KEY (payout_id) REFERENCES payouts(id);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'fk_payout_items_payout_id: %', SQLERRM;
END $$;

-- Unique index on keyed_fingerprint to prevent duplicate payout submissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_fingerprint ON payouts (keyed_fingerprint) WHERE keyed_fingerprint IS NOT NULL;

-- Prevent double-allocation of a ledger entry to multiple payout items
CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_items_ledger_entry ON payout_items (ledger_entry_id);

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_payouts_organizer ON payouts (organizer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts (status);
CREATE INDEX IF NOT EXISTS idx_payout_items_payout ON payout_items (payout_id);

-- Unique index on bank_accounts keyed_fingerprint for duplicate detection
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_fingerprint ON bank_accounts (keyed_fingerprint);
