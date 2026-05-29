CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    organizer_id TEXT NOT NULL,
    code TEXT NOT NULL,
    event_id TEXT,
    valid_from BIGINT NOT NULL,
    valid_until BIGINT NOT NULL,
    usage_limit INT NOT NULL DEFAULT 0,
    used_count INT NOT NULL DEFAULT 0,
    is_public BOOLEAN NOT NULL DEFAULT false,
    data JSONB NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_code ON promotions (code);
CREATE INDEX IF NOT EXISTS idx_promotions_organizer_created ON promotions (organizer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotions_active_public ON promotions (is_public, valid_until) WHERE is_public = true;
