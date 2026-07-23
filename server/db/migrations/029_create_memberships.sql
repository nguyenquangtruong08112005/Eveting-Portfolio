CREATE TABLE IF NOT EXISTS membership_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    min_points_required INT NOT NULL,
    discount_percentage NUMERIC NOT NULL DEFAULT 0.00,
    perks JSONB NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_memberships (
    user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
    tier_id TEXT NOT NULL REFERENCES membership_tiers(id),
    points_balance INT NOT NULL DEFAULT 0,
    lifetime_points INT NOT NULL DEFAULT 0,
    updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS loyalty_points_ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    points INT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('ticket_purchase', 'referral', 'bonus', 'refund')),
    reference_id TEXT,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loyalty_user ON loyalty_points_ledger(user_id);

-- Seed default tiers
INSERT INTO membership_tiers (id, name, min_points_required, discount_percentage, created_at)
VALUES
  ('tier_standard', 'standard', 0, 0.00, 1781976000000),
  ('tier_silver', 'silver', 100, 0.02, 1781976000000),
  ('tier_gold', 'gold', 500, 0.05, 1781976000000),
  ('tier_platinum', 'platinum', 1000, 0.10, 1781976000000)
ON CONFLICT (id) DO NOTHING;
