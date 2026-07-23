-- Migration: 016_create_password_reset_and_verification_tables
-- Description: Create auth_tokens table and add email_verified to auth_users for backend-owned verification flows.

CREATE TABLE IF NOT EXISTS auth_tokens (
    id          TEXT PRIMARY KEY,
    token_hash  TEXT NOT NULL UNIQUE,
    purpose     TEXT NOT NULL,
    email       TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_email ON auth_tokens (email);

ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
