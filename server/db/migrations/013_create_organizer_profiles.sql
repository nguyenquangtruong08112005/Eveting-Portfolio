-- Migration: 013_create_organizer_profiles
-- Description: PostgreSQL schema for organizer profiles.

CREATE TABLE IF NOT EXISTS organizer_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_name TEXT NOT NULL DEFAULT '',
    tax_code TEXT DEFAULT '',
    website TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'approved',
    created_at BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_organizer_profiles_user_id ON organizer_profiles (user_id);
