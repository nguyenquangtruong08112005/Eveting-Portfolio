-- Migration: 073_event_builder_address_questions
-- Description: Additive event-builder fields, Vietnam location lookup, stable
-- attendee questions, and order-scoped attendee answers.

CREATE TABLE IF NOT EXISTS vietnam_locations (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    level TEXT NOT NULL,
    parent_code TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_vietnam_locations_level
        CHECK (level IN ('province', 'district', 'ward')),
    CONSTRAINT uq_vietnam_locations_level_code UNIQUE (level, code)
);

CREATE INDEX IF NOT EXISTS idx_vietnam_locations_parent
    ON vietnam_locations (level, parent_code, sort_order, name);

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS message_for_attendee TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS province_code TEXT,
    ADD COLUMN IF NOT EXISTS province_name TEXT,
    ADD COLUMN IF NOT EXISTS district_code TEXT,
    ADD COLUMN IF NOT EXISTS district_name TEXT,
    ADD COLUMN IF NOT EXISTS ward_code TEXT,
    ADD COLUMN IF NOT EXISTS ward_name TEXT,
    ADD COLUMN IF NOT EXISTS street_address TEXT;

CREATE INDEX IF NOT EXISTS idx_events_vietnam_address
    ON events (province_code, district_code, ward_code);

CREATE OR REPLACE FUNCTION enforce_private_event_visibility()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_private THEN
        NEW.visibility := 'private';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_private_visibility ON events;
CREATE TRIGGER trg_events_private_visibility
    BEFORE INSERT OR UPDATE OF visibility, is_private ON events
    FOR EACH ROW
    EXECUTE FUNCTION enforce_private_event_visibility();

CREATE TABLE IF NOT EXISTS event_custom_questions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT false,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_event_custom_questions_type
        CHECK (question_type IN ('text', 'single_choice', 'multi_choice')),
    CONSTRAINT chk_event_custom_questions_options_array
        CHECK (jsonb_typeof(options) = 'array'),
    CONSTRAINT uq_event_custom_questions_order UNIQUE (event_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_event_custom_questions_event
    ON event_custom_questions (event_id, sort_order);

CREATE TABLE IF NOT EXISTS order_attendees (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    attendee_name TEXT,
    attendee_email TEXT,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    question_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_order_attendees_answers_object
        CHECK (jsonb_typeof(answers) = 'object'),
    CONSTRAINT chk_order_attendees_question_snapshot_array
        CHECK (jsonb_typeof(question_snapshot) = 'array'),
    CONSTRAINT uq_order_attendees_order_position UNIQUE (order_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_order_attendees_event
    ON order_attendees (event_id, order_id);

