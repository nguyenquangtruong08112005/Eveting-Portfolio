-- Migration: 044_gin_indexes
-- Description: GIN indexes for array/JSONB query paths (perf).

CREATE INDEX IF NOT EXISTS idx_events_category_gin ON events USING GIN (category);
CREATE INDEX IF NOT EXISTS idx_events_tags_gin ON events USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_events_location_gin ON events USING GIN (location jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_events_sponsors_gin ON events USING GIN (sponsors jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_events_raw_data_gin ON events USING GIN (raw_data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_venues_data_gin ON venues USING GIN (data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_promotions_data_gin ON promotions USING GIN (data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_tickets_raw_data_gin ON tickets USING GIN (raw_data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_user_profiles_matching_prefs_gin
    ON user_profiles USING GIN (matching_preferences jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_analytics_tickets_sold_gin
    ON analytics USING GIN (tickets_sold jsonb_path_ops);
