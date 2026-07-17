-- Migration: 037_create_event_ticket_types
-- Description: 3NF N1 — ticket types as first-class rows; drop events.ticket_types JSONB.
-- Empty-dev: no backfill required.

CREATE TABLE IF NOT EXISTS event_ticket_types (
    id          TEXT PRIMARY KEY,
    event_id    TEXT NOT NULL,
    code        TEXT NOT NULL,
    name        TEXT NOT NULL,
    price       NUMERIC NOT NULL DEFAULT 0,
    currency    TEXT NOT NULL DEFAULT 'VND',
    capacity    INT NOT NULL DEFAULT 0,
    available   INT NOT NULL DEFAULT 0,
    sold_count  INT NOT NULL DEFAULT 0,
    sales_start BIGINT,
    sales_end   BIGINT,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  BIGINT,
    updated_at  BIGINT,
    raw_data    JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uq_event_ticket_types_event_code UNIQUE (event_id, code)
);

CREATE INDEX IF NOT EXISTS idx_event_ticket_types_event_id
    ON event_ticket_types (event_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_event_ticket_types_event_id') THEN
        ALTER TABLE event_ticket_types
            ADD CONSTRAINT fk_event_ticket_types_event_id
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Clear free-text codes so FK can attach (empty-dev / non-relational prior values)
UPDATE order_items SET ticket_type_id = NULL
WHERE ticket_type_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM event_ticket_types ett WHERE ett.id = order_items.ticket_type_id
  );

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_ticket_type_id') THEN
        ALTER TABLE order_items
            ADD CONSTRAINT fk_order_items_ticket_type_id
            FOREIGN KEY (ticket_type_id) REFERENCES event_ticket_types(id)
            ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE events DROP COLUMN IF EXISTS ticket_types;
