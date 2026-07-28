-- Migration: 074_featured_artist_profiles
-- Description: Additive profile fields used by event-builder artist creation
-- and the featured artist studio.

ALTER TABLE featured_profiles
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS banner_url TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS category_tag TEXT,
    ADD COLUMN IF NOT EXISTS external_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_by_user_id TEXT;

-- Existing legacy rows may contain case-only duplicate slugs. Normalize them
-- deterministically before installing the case-insensitive uniqueness guard.
WITH ranked_slugs AS (
    SELECT id,
           LOWER(BTRIM(slug)) AS normalized_slug,
           ROW_NUMBER() OVER (
               PARTITION BY LOWER(BTRIM(slug))
               ORDER BY id
           ) AS slug_rank
    FROM featured_profiles
    WHERE NULLIF(BTRIM(slug), '') IS NOT NULL
)
UPDATE featured_profiles profile
SET slug = CASE
    WHEN ranked.slug_rank = 1 THEN ranked.normalized_slug
    ELSE ranked.normalized_slug || '-' || LEFT(profile.id, 8)
END
FROM ranked_slugs ranked
WHERE profile.id = ranked.id;

UPDATE featured_profiles
SET slug = NULL
WHERE slug IS NOT NULL AND BTRIM(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_featured_profiles_slug
    ON featured_profiles (LOWER(slug))
    WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_featured_profiles_category_tag
    ON featured_profiles (category_tag);

ALTER TABLE auth_users
    ADD COLUMN IF NOT EXISTS is_featured_artist BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_auth_users_featured_artist
    ON auth_users (is_featured_artist)
    WHERE is_featured_artist = true;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_featured_profiles_created_by_user_id'
    ) THEN
        ALTER TABLE featured_profiles
            ADD CONSTRAINT fk_featured_profiles_created_by_user_id
            FOREIGN KEY (created_by_user_id)
            REFERENCES auth_users(id)
            ON DELETE SET NULL;
    END IF;
END $$;
