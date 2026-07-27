-- Migration 068: Add named CHECK constraints and correct default to payouts
--
-- If payouts was created by a prior version (before 066) it may lack the
-- amount > 0 and status CHECK constraints and the correct status default.
-- This forward migration adds them safely and idempotently for existing tables.

ALTER TABLE payouts ALTER COLUMN status SET DEFAULT 'pending_provider_submission';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payouts_amount_positive') THEN
    ALTER TABLE payouts ADD CONSTRAINT chk_payouts_amount_positive CHECK (amount > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payouts_status_valid') THEN
    ALTER TABLE payouts ADD CONSTRAINT chk_payouts_status_valid
      CHECK (status IN ('pending_provider_submission', 'pending_admin_approval', 'processing', 'completed', 'failed'));
  END IF;
END $$;
