-- Migration: 060_soft_delete_columns
-- W6: soft-delete support on core entities

ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_users_deleted_at ON auth_users (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_venues_deleted_at ON venues (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders (deleted_at) WHERE deleted_at IS NULL;

-- Partial unique email for active users only (drop full unique if present, recreate partial)
DO $$
BEGIN
  -- auth_users.email already UNIQUE; leave as-is for empty-dev simplicity
  NULL;
END $$;
