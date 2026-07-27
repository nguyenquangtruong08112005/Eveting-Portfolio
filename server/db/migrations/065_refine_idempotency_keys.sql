DROP TABLE IF EXISTS idempotency_keys CASCADE;

CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    status TEXT NOT NULL, -- 'IN_PROGRESS', 'COMPLETED'
    response_code INT,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX idx_idempotency_keys_key_user_endpoint ON idempotency_keys (key, user_id, endpoint);
CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys (expires_at);
