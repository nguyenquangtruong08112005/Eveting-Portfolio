-- Migration 067: Add encrypted_payload/masked_display columns to bank_accounts
--
-- Migration 066 created bank_accounts with legacy plaintext columns
-- (encrypted_account_number, account_holder, bank_name). Forward migration 067
-- adds the encrypted payload columns and makes legacy columns nullable so
-- new encrypted-only writes do not need to store plaintext.
-- Legacy data is preserved; rows without encrypted_payload are returned
-- as "not found" by getBankAccount, requiring safe re-registration.

-- Add new encrypted storage columns (if not already present from 066 rebuild)
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS encrypted_payload TEXT;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS masked_display TEXT;

-- Make legacy columns nullable so new writes can ignore them
ALTER TABLE bank_accounts ALTER COLUMN encrypted_account_number DROP NOT NULL;
ALTER TABLE bank_accounts ALTER COLUMN account_holder DROP NOT NULL;
ALTER TABLE bank_accounts ALTER COLUMN bank_name DROP NOT NULL;
