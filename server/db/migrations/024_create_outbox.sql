-- Migration: 024_create_outbox
-- Description: Create the durable transactional outbox table.

CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL, -- 'notification', 'search_index'
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_retry ON outbox (status, retry_count);
