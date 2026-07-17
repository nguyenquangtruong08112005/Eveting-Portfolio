-- Migration: 035_audit_and_auth_tokens_user_fks
-- Description: Optional actor FKs:
--   audit_logs.user_id  → auth_users(id) ON DELETE SET NULL
--   auth_tokens.user_id → auth_users(id) ON DELETE CASCADE (nullable)
-- Dependency: 002 auth_users, 016 auth_tokens, 025 audit_logs
-- Note: resource_id stays polymorphic (no FK).

-- ---------------------------------------------------------------------------
-- audit_logs: allow SET NULL on user delete
-- ---------------------------------------------------------------------------

ALTER TABLE audit_logs
  ALTER COLUMN user_id DROP NOT NULL;

-- Orphan actors → NULL so FK can be added
UPDATE audit_logs a
SET user_id = NULL
WHERE a.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = a.user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_user_id') THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT fk_audit_logs_user_id
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

-- ---------------------------------------------------------------------------
-- auth_tokens: optional link to user when email already registered
-- ---------------------------------------------------------------------------

ALTER TABLE auth_tokens
  ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Backfill from matching email (best-effort)
UPDATE auth_tokens t
SET user_id = u.id
FROM auth_users u
WHERE t.user_id IS NULL
  AND LOWER(t.email) = LOWER(u.email);

-- Clear bad user_id values
UPDATE auth_tokens t
SET user_id = NULL
WHERE t.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.id = t.user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_auth_tokens_user_id') THEN
    ALTER TABLE auth_tokens
      ADD CONSTRAINT fk_auth_tokens_user_id
      FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens (user_id);
