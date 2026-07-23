-- Migration: 022_create_seat_maps
-- Description: Creates seat maps, seat sections, and seats tables.

CREATE TABLE IF NOT EXISTS seat_maps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    total_rows INT NOT NULL,
    total_cols INT NOT NULL,
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS seat_sections (
    id TEXT PRIMARY KEY,
    seat_map_id TEXT NOT NULL REFERENCES seat_maps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_multiplier NUMERIC DEFAULT 1.0,
    created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS seats (
    id TEXT PRIMARY KEY,
    seat_section_id TEXT NOT NULL REFERENCES seat_sections(id) ON DELETE CASCADE,
    row_name TEXT NOT NULL,
    seat_number INT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available', -- 'available', 'blocked'
    created_at BIGINT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seats_section_row_num ON seats (seat_section_id, row_name, seat_number);
