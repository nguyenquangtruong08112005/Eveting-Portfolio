-- Migration 067: Add encrypted_payload/masked_display columns to bank_accounts
--
-- Supports two scenarios:
--   1. Fresh install — migration 066 already created encrypted_payload / masked_display.
--   2. Legacy upgrade — bank_accounts has encrypted_account_number, account_holder, bank_name.
-- Legacy data is preserved; rows without encrypted_payload are returned
-- as "not found" by getBankAccount, requiring safe re-registration.

-- Add new encrypted storage columns (if not already present from 066 rebuild)
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS encrypted_payload TEXT;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS masked_display TEXT;

-- Make legacy columns nullable (if they exist from a prior schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'bank_accounts' AND column_name = 'encrypted_account_number'
  ) THEN
    ALTER TABLE bank_accounts ALTER COLUMN encrypted_account_number DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'bank_accounts' AND column_name = 'account_holder'
  ) THEN
    ALTER TABLE bank_accounts ALTER COLUMN account_holder DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'bank_accounts' AND column_name = 'bank_name'
  ) THEN
    ALTER TABLE bank_accounts ALTER COLUMN bank_name DROP NOT NULL;
  END IF;
END $$;
