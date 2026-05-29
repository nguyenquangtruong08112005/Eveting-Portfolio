-- Migration: 008_create_user_profiles
-- Description: PostgreSQL schema for user profile/identity data.
--              Mirrors Firebase Users collection fields so auth, reviews,
--              tickets, events, organizer/admin flows can exit Firebase.
--              Uses same id (Firebase UID) as auth_users for joinability.
--              No FK to auth_users -- auth_users may not exist when this runs.

CREATE TABLE IF NOT EXISTS user_profiles (
    id                   TEXT PRIMARY KEY,
    email                TEXT NOT NULL DEFAULT '',
    name                 TEXT NOT NULL DEFAULT '',
    profile_pic_url      TEXT DEFAULT '',
    cover_photo_url      TEXT DEFAULT '',
    bio                  TEXT DEFAULT '',
    birth_date           BIGINT,
    roles                TEXT[] NOT NULL DEFAULT '{attendee}',
    created_at           BIGINT NOT NULL,
    followed_profile_ids TEXT[] NOT NULL DEFAULT '{}',
    history_event_ids    TEXT[] NOT NULL DEFAULT '{}',
    followers_count      INT NOT NULL DEFAULT 0,
    following_count      INT NOT NULL DEFAULT 0,
    points               INT NOT NULL DEFAULT 0,
    level                TEXT NOT NULL DEFAULT 'bronze',
    matching_preferences JSONB DEFAULT '{}',
    shared_media         JSONB DEFAULT '[]'::jsonb,
    fcm_tokens           TEXT[] NOT NULL DEFAULT '{}',
    organizer_info       JSONB,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles (email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_roles ON user_profiles USING GIN (roles);
