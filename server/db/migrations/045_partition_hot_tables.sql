-- Migration: 045_partition_hot_tables
-- Description: Partition high-growth tables by created_at (RANGE).
-- Empty-dev: drop + recreate with DEFAULT partition + yearly ranges.
-- PK includes created_at (Postgres partition requirement).

-- ─── notifications ───
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
    id          TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    type        TEXT NOT NULL,
    event_id    TEXT,
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE notifications_default PARTITION OF notifications DEFAULT;

CREATE TABLE notifications_2025 PARTITION OF notifications
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE notifications_2026 PARTITION OF notifications
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE notifications_2027 PARTITION OF notifications
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_created_at_desc ON notifications (created_at DESC);

-- Note: notifications.user_id may be sentinel 'all' (broadcast) — no user FK.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notifications_event_id') THEN
        ALTER TABLE notifications
            ADD CONSTRAINT fk_notifications_event_id
            FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'notifications FKs: %', SQLERRM;
END $$;

-- ─── outbox ───
DROP TABLE IF EXISTS outbox CASCADE;

CREATE TABLE outbox (
    id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE outbox_default PARTITION OF outbox DEFAULT;
CREATE TABLE outbox_2025 PARTITION OF outbox
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE outbox_2026 PARTITION OF outbox
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE outbox_2027 PARTITION OF outbox
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE INDEX idx_outbox_status_retry ON outbox (status, retry_count);
CREATE INDEX idx_outbox_created_at ON outbox (created_at);

-- ─── audit_logs ───
DROP TABLE IF EXISTS audit_logs CASCADE;

CREATE TABLE audit_logs (
    id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    changes JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;
CREATE TABLE audit_logs_2025 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE audit_logs_2026 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE audit_logs_2027 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE INDEX idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_user_id') THEN
        ALTER TABLE audit_logs
            ADD CONSTRAINT fk_audit_logs_user_id
            FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'audit_logs FK: %', SQLERRM;
END $$;
