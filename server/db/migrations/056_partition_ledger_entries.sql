-- Migration: 056_partition_ledger_entries
-- W4: partition ledger by created_at (empty-dev recreate)

DROP TABLE IF EXISTS ledger_entries CASCADE;

CREATE TABLE ledger_entries (
  id             TEXT NOT NULL,
  order_id       TEXT,
  organizer_id   TEXT,
  gross_amount   NUMERIC DEFAULT 0,
  platform_fee   NUMERIC DEFAULT 0,
  net_amount     NUMERIC DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_data       JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE ledger_entries_default PARTITION OF ledger_entries DEFAULT;
CREATE TABLE ledger_entries_2025 PARTITION OF ledger_entries
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE ledger_entries_2026 PARTITION OF ledger_entries
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE ledger_entries_2027 PARTITION OF ledger_entries
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE INDEX idx_ledger_entries_organizer ON ledger_entries (organizer_id);
CREATE INDEX idx_ledger_entries_order ON ledger_entries (order_id);
CREATE INDEX idx_ledger_entries_created ON ledger_entries (created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ledger_entries_order_id') THEN
    ALTER TABLE ledger_entries
      ADD CONSTRAINT fk_ledger_entries_order_id
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_ledger_entries_organizer_id') THEN
    ALTER TABLE ledger_entries
      ADD CONSTRAINT fk_ledger_entries_organizer_id
      FOREIGN KEY (organizer_id) REFERENCES auth_users(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'ledger FKs: %', SQLERRM;
END $$;
