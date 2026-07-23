-- Migration: 055_composite_indexes
-- W4: common query composites

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications (user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tickets_event_status
  ON tickets (event_id, status);

CREATE INDEX IF NOT EXISTS idx_tickets_user_status
  ON tickets (user_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_status
  ON payment_attempts (order_id, status);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created
  ON outbox (status, created_at);

CREATE INDEX IF NOT EXISTS idx_events_lifecycle_visibility_date
  ON events (lifecycle_status, visibility, date);
