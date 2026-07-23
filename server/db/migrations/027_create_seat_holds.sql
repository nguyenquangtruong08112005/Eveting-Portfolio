-- Migration: 027_create_seat_holds
-- Description: Creates the seat_holds table and indices for reserved seating holds.

CREATE TABLE IF NOT EXISTS seat_holds (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    held_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'held', -- 'held', 'released', 'sold'
    created_at BIGINT NOT NULL
);

-- Ensure a seat can only have one active hold per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_seat_holds ON seat_holds (event_id, seat_id) WHERE (status = 'held');

-- Index on expires_at to clean up / filter expired holds quickly
CREATE INDEX IF NOT EXISTS idx_seat_holds_expires_at ON seat_holds (expires_at);

-- Index on event_id for fast lookup of an event's seat holds
CREATE INDEX IF NOT EXISTS idx_seat_holds_event_id ON seat_holds (event_id);
