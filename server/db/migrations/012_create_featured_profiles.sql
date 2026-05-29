-- Migration: 012_create_featured_profiles
-- Description: PostgreSQL schema for featured profiles.

CREATE TABLE IF NOT EXISTS featured_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    profile_type TEXT DEFAULT 'artist',
    bio TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    genres TEXT[] DEFAULT '{}',
    follower_count INT DEFAULT 0,
    owner_user_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_featured_profiles_name ON featured_profiles (name);
CREATE INDEX IF NOT EXISTS idx_featured_profiles_owner_user_id ON featured_profiles (owner_user_id);
