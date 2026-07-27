-- Migration 069: Add submitting status to payouts CHECK constraint
--
-- Enables exclusive claim of a pending_provider_submission payout:
--   pending_provider_submission → submitting (exclusive lock under TX)
--   submitting → processing            (after provider dispatch, outside TX)
--   submitting → failed                (provider error, outside TX)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payouts_status_valid') THEN
    ALTER TABLE payouts DROP CONSTRAINT chk_payouts_status_valid;
  END IF;
END $$;

ALTER TABLE payouts ADD CONSTRAINT chk_payouts_status_valid
  CHECK (status IN ('submitting', 'pending_provider_submission', 'pending_admin_approval', 'processing', 'completed', 'failed'));
