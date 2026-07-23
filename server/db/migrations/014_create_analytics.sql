-- Migration: 014_create_analytics
-- Description: PostgreSQL schema for analytics.

CREATE TABLE IF NOT EXISTS analytics (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    total_revenue NUMERIC DEFAULT 0,
    tickets_sold JSONB DEFAULT '{}'::jsonb,
    daily_sales JSONB DEFAULT '{}'::jsonb,
    check_ins INT DEFAULT 0,
    views INT DEFAULT 0,
    views_over_time JSONB DEFAULT '{}'::jsonb,
    last_updated_at BIGINT,
    raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_analytics_event_id ON analytics (event_id);
