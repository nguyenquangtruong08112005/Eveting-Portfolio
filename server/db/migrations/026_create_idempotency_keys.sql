-- Migration: 026_create_idempotency_keys
-- Description: Create the idempotency keys storage table for duplicate request prevention.

DROP TABLE IF EXISTS idempotency_keys CASCADE;

CREATE TABLE idempotency_keys (
    key TEXT PRIMARY KEY,
    response_code INT NOT NULL,
    response_body JSONB NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys (expires_at);
