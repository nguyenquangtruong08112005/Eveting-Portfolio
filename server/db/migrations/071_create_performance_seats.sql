-- Migration: 071_create_performance_seats
-- Phase 06: performance-scoped seat inventory. PostgreSQL rows are lock authority.

CREATE TABLE IF NOT EXISTS performances (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    seat_map_id TEXT NOT NULL REFERENCES seat_maps(id) ON DELETE RESTRICT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_performances_status
        CHECK (status IN ('SCHEDULED', 'CANCELLED', 'COMPLETED')),
    CONSTRAINT chk_performances_time_range
        CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_performances_one_default_per_event
    ON performances (event_id)
    WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_performances_event_starts_at
    ON performances (event_id, starts_at);

CREATE TABLE IF NOT EXISTS performance_seats (
    id TEXT PRIMARY KEY,
    performance_id TEXT NOT NULL REFERENCES performances(id) ON DELETE CASCADE,
    seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    ticket_type_id TEXT REFERENCES event_ticket_types(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    held_by_user_id TEXT REFERENCES auth_users(id) ON DELETE SET NULL,
    hold_token TEXT,
    hold_expires_at TIMESTAMPTZ,
    sold_ticket_id TEXT REFERENCES tickets(id) ON DELETE SET NULL,
    price NUMERIC,
    version INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_performance_seats_performance_seat UNIQUE (performance_id, seat_id),
    CONSTRAINT uq_performance_seats_id_performance UNIQUE (id, performance_id),
    CONSTRAINT chk_performance_seats_status
        CHECK (status IN ('AVAILABLE', 'HELD', 'SOLD', 'BLOCKED')),
    CONSTRAINT chk_performance_seats_price
        CHECK (price IS NULL OR price >= 0),
    CONSTRAINT chk_performance_seats_hold_state
        CHECK (
            (
                status = 'HELD'
                AND held_by_user_id IS NOT NULL
                AND hold_token IS NOT NULL
                AND hold_expires_at IS NOT NULL
                AND sold_ticket_id IS NULL
            )
            OR (
                status <> 'HELD'
                AND held_by_user_id IS NULL
                AND hold_token IS NULL
                AND hold_expires_at IS NULL
            )
        ),
    CONSTRAINT chk_performance_seats_sold_state
        CHECK (status = 'SOLD' OR sold_ticket_id IS NULL)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_performance_seats_sold_state'
    ) THEN
        ALTER TABLE performance_seats
            ADD CONSTRAINT chk_performance_seats_sold_state
            CHECK (status = 'SOLD' OR sold_ticket_id IS NULL);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_seats_sold_ticket
    ON performance_seats (sold_ticket_id)
    WHERE sold_ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_performance_seats_availability
    ON performance_seats (performance_id, status);

CREATE INDEX IF NOT EXISTS idx_performance_seats_expired_holds
    ON performance_seats (hold_expires_at)
    WHERE status = 'HELD';

CREATE OR REPLACE FUNCTION set_performance_seat_hold_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'HELD'
       AND (
           TG_OP = 'INSERT'
           OR OLD.status IS DISTINCT FROM 'HELD'
           OR NEW.hold_token IS DISTINCT FROM OLD.hold_token
           OR NEW.held_by_user_id IS DISTINCT FROM OLD.held_by_user_id
       ) THEN
        NEW.hold_expires_at := NOW() + INTERVAL '10 minutes';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_performance_seats_fixed_hold_ttl ON performance_seats;
CREATE TRIGGER trg_performance_seats_fixed_hold_ttl
    BEFORE INSERT OR UPDATE OF status, hold_token, held_by_user_id ON performance_seats
    FOR EACH ROW
    EXECUTE FUNCTION set_performance_seat_hold_expiry();

CREATE OR REPLACE FUNCTION enforce_performance_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    current_count INTEGER;
BEGIN
    PERFORM 1
    FROM performances
    WHERE id = NEW.performance_id
    FOR UPDATE;

    IF EXISTS (
        SELECT 1
        FROM performance_seats
        WHERE performance_id = NEW.performance_id
          AND seat_id = NEW.seat_id
    ) THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*)
    INTO current_count
    FROM performance_seats
    WHERE performance_id = NEW.performance_id;

    IF current_count >= 500 THEN
        RAISE EXCEPTION 'A performance cannot contain more than 500 seats'
            USING ERRCODE = 'check_violation',
                  CONSTRAINT = 'chk_performance_seats_max_500';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_performance_seats_max_500 ON performance_seats;
CREATE TRIGGER trg_performance_seats_max_500
    BEFORE INSERT ON performance_seats
    FOR EACH ROW
    EXECUTE FUNCTION enforce_performance_seat_limit();

INSERT INTO performances (
    id,
    event_id,
    seat_map_id,
    starts_at,
    ends_at,
    status,
    is_default
)
SELECT
    'perf_' || e.id,
    e.id,
    sm.id,
    e.start_at,
    e.end_at,
    'SCHEDULED',
    true
FROM events e
JOIN seat_maps sm
  ON sm.id = COALESCE(
      e.raw_data ->> 'seatMapId',
      e.raw_data ->> 'seat_map_id',
      e.raw_data -> 'raw_data' ->> 'seatMapId',
      e.raw_data -> 'raw_data' ->> 'seat_map_id'
  )
WHERE NOT EXISTS (
    SELECT 1
    FROM performances existing
    WHERE existing.event_id = e.id
      AND existing.is_default = true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO performance_seats (
    id,
    performance_id,
    seat_id,
    status
)
SELECT
    'pseat_' || MD5(p.id || ':' || s.id),
    p.id,
    s.id,
    CASE WHEN s.status = 'blocked' THEN 'BLOCKED' ELSE 'AVAILABLE' END
FROM performances p
JOIN seat_sections ss ON ss.seat_map_id = p.seat_map_id
JOIN seats s ON s.seat_section_id = ss.id
ON CONFLICT (performance_id, seat_id) DO NOTHING;
