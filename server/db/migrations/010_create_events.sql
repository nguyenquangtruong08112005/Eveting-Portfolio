-- Migration: 010_create_events
-- Description: PostgreSQL schema for events.

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    image_url TEXT,
    banner_url TEXT,
    featured_profile_ids TEXT[] DEFAULT '{}',
    category TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    date BIGINT,
    end_date BIGINT,
    event_type TEXT DEFAULT 'physical',
    online_url TEXT,
    location JSONB,
    geohash TEXT,
    venue_id TEXT,
    venue_name TEXT,
    city TEXT,
    ticket_types JSONB DEFAULT '{}'::jsonb,
    min_price NUMERIC DEFAULT 0,
    video_url TEXT,
    is_outdoor BOOLEAN DEFAULT false,
    organizer_id TEXT,
    status TEXT DEFAULT 'pending',
    visibility TEXT DEFAULT 'private',
    recurring_rule JSONB,
    hot_score NUMERIC DEFAULT 0,
    view_count INT DEFAULT 0,
    required_age INT DEFAULT 0,
    sponsors JSONB DEFAULT '[]'::jsonb,
    created_at BIGINT,
    last_updated_at BIGINT,
    raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events (date);
CREATE INDEX IF NOT EXISTS idx_events_status_visibility ON events (status, visibility);
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events (organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_geohash ON events (geohash);
