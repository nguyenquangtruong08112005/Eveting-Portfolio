-- Migration: 070_extend_seat_layouts
-- Phase 06: additive seat-layout metadata for the normalized seat map schema.

ALTER TABLE seat_maps
    ADD COLUMN IF NOT EXISTS venue_id TEXT,
    ADD COLUMN IF NOT EXISTS layout_schema JSONB NOT NULL DEFAULT '{"version":1,"sections":[]}'::jsonb,
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE seat_sections
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS color TEXT,
    ADD COLUMN IF NOT EXISTS layout_data JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE seats
    ADD COLUMN IF NOT EXISTS code TEXT,
    ADD COLUMN IF NOT EXISTS x NUMERIC,
    ADD COLUMN IF NOT EXISTS y NUMERIC,
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE seat_maps SET total_rows = 1 WHERE total_rows < 1;
UPDATE seat_maps SET total_cols = 1 WHERE total_cols < 1;
UPDATE seat_maps SET version = 1 WHERE version < 1;

UPDATE seats
SET code = row_name || seat_number::text
WHERE code IS NULL OR BTRIM(code) = '';

CREATE OR REPLACE FUNCTION fill_missing_seat_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.code IS NULL OR BTRIM(NEW.code) = '' THEN
        NEW.code := NEW.row_name || NEW.seat_number::text;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seats_fill_missing_code ON seats;
CREATE TRIGGER trg_seats_fill_missing_code
    BEFORE INSERT OR UPDATE OF row_name, seat_number, code ON seats
    FOR EACH ROW
    EXECUTE FUNCTION fill_missing_seat_code();

ALTER TABLE seats ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_seat_maps_venue_id') THEN
        ALTER TABLE seat_maps
            ADD CONSTRAINT fk_seat_maps_venue_id
            FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_seat_maps_dimensions') THEN
        ALTER TABLE seat_maps
            ADD CONSTRAINT chk_seat_maps_dimensions
            CHECK (total_rows > 0 AND total_cols > 0 AND version > 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_seat_maps_layout_schema') THEN
        ALTER TABLE seat_maps
            ADD CONSTRAINT chk_seat_maps_layout_schema
            CHECK (
                jsonb_typeof(layout_schema) = 'object'
                AND jsonb_typeof(layout_schema -> 'sections') = 'array'
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_seats_code') THEN
        ALTER TABLE seats
            ADD CONSTRAINT chk_seats_code
            CHECK (BTRIM(code) <> '');
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_seats_section_code
    ON seats (seat_section_id, code);

CREATE INDEX IF NOT EXISTS idx_seat_maps_venue_active
    ON seat_maps (venue_id, is_active)
    WHERE venue_id IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_seat_map_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_map_id TEXT;
    current_count INTEGER;
BEGIN
    SELECT ss.seat_map_id
    INTO target_map_id
    FROM seat_sections ss
    WHERE ss.id = NEW.seat_section_id;

    PERFORM 1
    FROM seat_maps sm
    WHERE sm.id = target_map_id
    FOR UPDATE;

    SELECT COUNT(*)
    INTO current_count
    FROM seats s
    JOIN seat_sections ss ON ss.id = s.seat_section_id
    WHERE ss.seat_map_id = target_map_id;

    IF current_count >= 500 THEN
        RAISE EXCEPTION 'A seat map cannot contain more than 500 seats'
            USING ERRCODE = 'check_violation',
                  CONSTRAINT = 'chk_seat_maps_max_500';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seat_maps_max_500 ON seats;
CREATE TRIGGER trg_seat_maps_max_500
    BEFORE INSERT ON seats
    FOR EACH ROW
    EXECUTE FUNCTION enforce_seat_map_seat_limit();
