-- Migration: 021_order_foundation_hardening
-- Description: Hardening migration — idempotently ensures all columns and indexes
-- used by the order repository and smoke tests exist, regardless of which version
-- of 019/020 may have been applied. All statements use IF NOT EXISTS.
--
-- NOTE: This migration is purely defensive for existing databases. Fresh installs
-- get the full schema from 019 (rewritten) + 020.

-- ── orders columns ──────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS id TEXT,
  ADD COLUMN IF NOT EXISTS user_id TEXT,
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS organizer_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'VND',
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS expires_at BIGINT,
  ADD COLUMN IF NOT EXISTS paid_at BIGINT,
  ADD COLUMN IF NOT EXISTS cancelled_at BIGINT,
  ADD COLUMN IF NOT EXISTS created_at BIGINT,
  ADD COLUMN IF NOT EXISTS updated_at BIGINT,
  ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

-- ── order_items columns ─────────────────────────────────────────────────
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS id TEXT,
  ADD COLUMN IF NOT EXISTS order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ticket_type_id TEXT,
  ADD COLUMN IF NOT EXISTS ticket_type TEXT,
  ADD COLUMN IF NOT EXISTS event_id TEXT,
  ADD COLUMN IF NOT EXISTS event_name TEXT,
  ADD COLUMN IF NOT EXISTS ticket_id TEXT,
  ADD COLUMN IF NOT EXISTS seat_id TEXT,
  ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS created_at BIGINT;

-- ── payment_attempts columns ────────────────────────────────────────────
ALTER TABLE payment_attempts
  ADD COLUMN IF NOT EXISTS id TEXT,
  ADD COLUMN IF NOT EXISTS order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ticket_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'VND',
  ADD COLUMN IF NOT EXISTS request_payload JSONB,
  ADD COLUMN IF NOT EXISTS response_payload JSONB,
  ADD COLUMN IF NOT EXISTS gateway_response JSONB,
  ADD COLUMN IF NOT EXISTS completed_at BIGINT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_at BIGINT,
  ADD COLUMN IF NOT EXISTS updated_at BIGINT;

-- ── ticket linkage columns ──────────────────────────────────────────────
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS order_id TEXT,
  ADD COLUMN IF NOT EXISTS order_item_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_attempt_id TEXT;

-- ── indexes on orders ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_event_id ON orders (event_id);
CREATE INDEX IF NOT EXISTS idx_orders_organizer_id ON orders (organizer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders (idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_idempotency ON orders (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ── indexes on order_items ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_event_id ON order_items (event_id);
CREATE INDEX IF NOT EXISTS idx_order_items_ticket_id ON order_items (ticket_id);

-- ── indexes on payment_attempts ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_id ON payment_attempts (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_provider_order_id ON payment_attempts (provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_status ON payment_attempts (status);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_ticket_id ON payment_attempts (ticket_id);

-- ── indexes on tickets ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets (order_id);
