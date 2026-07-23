-- Migration: 015_add_ticket_payment_fields
-- Description: Add payment-related columns to tickets table for ZaloPay flow.

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS zalo_app_trans_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_attempt TEXT;
