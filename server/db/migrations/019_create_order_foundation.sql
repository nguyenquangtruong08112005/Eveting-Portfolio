-- Migration: 019_create_order_foundation
-- Description: Standard order model for future checkout flow.
-- Adds orders, order_items, payment_attempts tables and nullable linkage columns on tickets.

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_id TEXT,
    organizer_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending_payment',
    subtotal_amount NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    fee_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'VND',
    idempotency_key TEXT,
    notes TEXT,
    expires_at BIGINT,
    paid_at BIGINT,
    cancelled_at BIGINT,
    created_at BIGINT,
    updated_at BIGINT,
    raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_type_id TEXT,
    ticket_type TEXT,
    event_id TEXT,
    event_name TEXT,
    ticket_id TEXT,
    seat_id TEXT,
    quantity INT DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    subtotal NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    status TEXT,
    created_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

CREATE TABLE IF NOT EXISTS payment_attempts (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    ticket_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    provider TEXT,
    provider_order_id TEXT,
    provider_transaction_id TEXT,
    transaction_id TEXT,
    amount NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'VND',
    request_payload JSONB,
    response_payload JSONB,
    gateway_response JSONB,
    completed_at BIGINT,
    failure_reason TEXT,
    created_at BIGINT,
    updated_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_id ON payment_attempts (order_id);

ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS order_id TEXT,
  ADD COLUMN IF NOT EXISTS order_item_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_attempt_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tickets_order_id ON tickets (order_id);
