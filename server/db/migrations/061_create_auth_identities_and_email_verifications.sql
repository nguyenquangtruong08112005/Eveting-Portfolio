-- Migration: 061_create_auth_identities_and_email_verifications
-- Description: Create auth_identities and email_verifications tables for social auth and email verification flows.

CREATE TABLE IF NOT EXISTS auth_identities (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    provider          TEXT NOT NULL,
    provider_subject  TEXT NOT NULL,
    provider_email    TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_auth_identities_provider_subject UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_auth_identities_user_id ON auth_identities (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_identities_provider_email ON auth_identities (provider, provider_email);

CREATE TABLE IF NOT EXISTS email_verifications (
    id          TEXT PRIMARY KEY,
    token_hash  TEXT NOT NULL UNIQUE,
    user_id     TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    consumed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token_hash ON email_verifications (token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications (user_id);
