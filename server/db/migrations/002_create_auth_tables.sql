-- Migration: 002_create_auth_tables
-- Description: PostgreSQL schema for backend-owned password-based auth.
--              Supports future migration away from Firebase Auth.
--              Users table stores auth credentials + profile basics.
--              Sessions table enables refresh token rotation, revoke/logout.
--
-- Required env vars (documented, not read here):
--   DATABASE_URL       -- PostgreSQL connection string
--   ACCESS_TOKEN_SECRET      -- HMAC key for JWT access tokens (>=256-bit)
--   ACCESS_TOKEN_EXPIRES_IN  -- e.g. '15m' (default in code)
--   REFRESH_TOKEN_EXPIRES_IN -- e.g. '7d' (default in code)
--
-- Roles: 'user', 'organizer', 'admin' (stored as text[])

CREATE TABLE IF NOT EXISTS auth_users (
    id              TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL DEFAULT '',
    password_hash   TEXT NOT NULL,
    roles           TEXT[] NOT NULL DEFAULT '{user}',
    profile_pic_url TEXT DEFAULT '',
    bio             TEXT DEFAULT '',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
    id                  TEXT PRIMARY KEY,
    user_id             TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    refresh_token_hash  TEXT NOT NULL UNIQUE,
    user_agent          TEXT DEFAULT '',
    ip_address          TEXT DEFAULT '',
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users (email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked_at ON sessions (revoked_at);
