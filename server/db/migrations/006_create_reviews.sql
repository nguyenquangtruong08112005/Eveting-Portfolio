-- Migration: 006_create_reviews
-- Description: PostgreSQL schema for event reviews.
--              No FK to events/tickets -- those tables may not exist
--              at the time this migration runs.

CREATE TABLE IF NOT EXISTS reviews (
    id          TEXT PRIMARY KEY,
    event_id    TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    rating      INT NOT NULL,
    comment     TEXT DEFAULT '',
    created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reviews_event_id_created_at ON reviews (event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews (user_id);
