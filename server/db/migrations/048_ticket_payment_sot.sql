-- Migration: 048_ticket_payment_sot
-- W1: payment SoT is payment_attempts + orders; strip payment columns from tickets.

ALTER TABLE tickets DROP COLUMN IF EXISTS payment_status;
ALTER TABLE tickets DROP COLUMN IF EXISTS last_payment_attempt;
ALTER TABLE tickets DROP COLUMN IF EXISTS zalo_app_trans_id;
ALTER TABLE tickets DROP COLUMN IF EXISTS payment_time;
