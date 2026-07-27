CREATE TABLE IF NOT EXISTS outbox_dlq (
    id TEXT PRIMARY KEY,
    outbox_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INT NOT NULL,
    error_message TEXT,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_dlq_status ON outbox_dlq (status);
CREATE INDEX IF NOT EXISTS idx_outbox_dlq_failed_at ON outbox_dlq (failed_at);

CREATE INDEX IF NOT EXISTS idx_outbox_pending_failed ON outbox (status)
    WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON outbox (created_at);
