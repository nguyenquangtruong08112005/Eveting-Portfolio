\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
    stored_visibility TEXT;
BEGIN
    IF to_regclass('public.event_custom_questions') IS NULL THEN
        RAISE EXCEPTION 'event_custom_questions table is missing';
    END IF;
    IF to_regclass('public.order_attendees') IS NULL THEN
        RAISE EXCEPTION 'order_attendees table is missing';
    END IF;
    IF to_regclass('public.vietnam_locations') IS NULL THEN
        RAISE EXCEPTION 'vietnam_locations table is missing';
    END IF;

    DELETE FROM events WHERE id = 'evt_phase07_db_smoke';
    INSERT INTO events (
        id,
        name,
        visibility,
        is_private,
        province_code,
        province_name,
        district_code,
        district_name,
        ward_code,
        ward_name,
        street_address
    ) VALUES (
        'evt_phase07_db_smoke',
        'Phase 07 DB Smoke',
        'public',
        true,
        '79',
        'Ho Chi Minh City',
        '760',
        'District 1',
        '26740',
        'Ben Nghe',
        '12 Nguyen Hue'
    );

    SELECT visibility
    INTO stored_visibility
    FROM events
    WHERE id = 'evt_phase07_db_smoke';

    IF stored_visibility <> 'private' THEN
        RAISE EXCEPTION 'private event visibility trigger failed';
    END IF;

    INSERT INTO event_custom_questions (
        id,
        event_id,
        question_text,
        question_type,
        is_required,
        options,
        sort_order
    ) VALUES (
        'eq_phase07_db_smoke',
        'evt_phase07_db_smoke',
        'Preferred session',
        'single_choice',
        true,
        '["Morning", "Evening"]'::jsonb,
        0
    );

    DELETE FROM featured_profiles WHERE id IN (
        'fp_phase07_db_smoke_a',
        'fp_phase07_db_smoke_b'
    );
    INSERT INTO featured_profiles (id, name, slug)
    VALUES ('fp_phase07_db_smoke_a', 'Phase 07 Artist A', 'phase-07-artist');

    BEGIN
        INSERT INTO featured_profiles (id, name, slug)
        VALUES ('fp_phase07_db_smoke_b', 'Phase 07 Artist B', 'PHASE-07-ARTIST');
        RAISE EXCEPTION 'case-insensitive slug uniqueness was not enforced';
    EXCEPTION
        WHEN unique_violation THEN
            NULL;
    END;
END $$;

ROLLBACK;

\echo Phase 07 event/artist database smoke passed.
