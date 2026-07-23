-- Migration: 020_refine_order_foundation
-- Description: Adds richer fields to order foundation tables (refinement for existing DBs).
-- All statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS organizer_id TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS expires_at BIGINT,
  ADD COLUMN IF NOT EXISTS paid_at BIGINT,
  ADD COLUMN IF NOT EXISTS cancelled_at BIGINT;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS ticket_type TEXT,
  ADD COLUMN IF NOT EXISTS ticket_id TEXT,
  ADD COLUMN IF NOT EXISTS seat_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;

ALTER TABLE payment_attempts
  ADD COLUMN IF NOT EXISTS ticket_id TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS request_payload JSONB,
  ADD COLUMN IF NOT EXISTS response_payload JSONB,
  ADD COLUMN IF NOT EXISTS completed_at BIGINT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending_payment';

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders (event_id);
CREATE INDEX IF NOT EXISTS idx_orders_organizer_id ON orders (organizer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_idempotency ON orders (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_event_id ON order_items (event_id);
CREATE INDEX IF NOT EXISTS idx_order_items_ticket_id ON order_items (ticket_id);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_provider_order_id ON payment_attempts (provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts (status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_ticket_id ON payment_attempts (ticket_id);
