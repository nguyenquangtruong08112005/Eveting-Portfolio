-- Migration: 038_social_junction_tables
-- Description: 3NF N2 — replace multi-value arrays with junction tables.
-- Empty-dev: drop array columns after creating tables.

CREATE TABLE IF NOT EXISTS user_follows (
    follower_id  TEXT NOT NULL,
    followee_id  TEXT NOT NULL,
    created_at   BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    PRIMARY KEY (follower_id, followee_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_followee
    ON user_follows (followee_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_follows_follower_id') THEN
        ALTER TABLE user_follows
            ADD CONSTRAINT fk_user_follows_follower_id
            FOREIGN KEY (follower_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS event_featured_profiles (
    event_id            TEXT NOT NULL,
    featured_profile_id TEXT NOT NULL,
    sort_order          INT NOT NULL DEFAULT 0,
    created_at          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    PRIMARY KEY (event_id, featured_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_event_featured_profiles_profile
    ON event_featured_profiles (featured_profile_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_event_featured_profiles_event_id') THEN
        ALTER TABLE event_featured_profiles
            ADD CONSTRAINT fk_event_featured_profiles_event_id
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_event_featured_profiles_profile_id') THEN
        ALTER TABLE event_featured_profiles
            ADD CONSTRAINT fk_event_featured_profiles_profile_id
            FOREIGN KEY (featured_profile_id) REFERENCES featured_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_event_history (
    user_id     TEXT NOT NULL,
    event_id    TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'attended',
    attended_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_user_event_history_event
    ON user_event_history (event_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_event_history_user_id') THEN
        ALTER TABLE user_event_history
            ADD CONSTRAINT fk_user_event_history_user_id
            FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_event_history_event_id') THEN
        ALTER TABLE user_event_history
            ADD CONSTRAINT fk_user_event_history_event_id
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_devices (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    fcm_token    TEXT NOT NULL,
    platform     TEXT,
    last_seen_at BIGINT,
    created_at   BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    CONSTRAINT uq_user_devices_fcm_token UNIQUE (fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices (user_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_devices_user_id') THEN
        ALTER TABLE user_devices
            ADD CONSTRAINT fk_user_devices_user_id
            FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Drop denormalized multi-value columns (empty-dev)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS followed_profile_ids;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS history_event_ids;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS fcm_tokens;
ALTER TABLE events DROP COLUMN IF EXISTS featured_profile_ids;
