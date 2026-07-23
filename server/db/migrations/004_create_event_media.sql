-- Migration: 004_create_event_media
-- Description: PostgreSQL schema for event media gallery.
--              No FK to tickets/events yet -- those tables may not exist
--              at the time this migration runs.

CREATE TABLE IF NOT EXISTS event_media (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    event_id    TEXT NOT NULL,
    url         TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'image',
    caption     TEXT DEFAULT '',
    created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_media_event_id_created_at ON event_media (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_media_user_id ON event_media (user_id);
