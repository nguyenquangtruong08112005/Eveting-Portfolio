-- Migration: 042_identity_column_dedupe
-- Description: Full identity de-dupe.
--   auth_users  = credentials + authz (email, password, roles, flags)
--   user_profiles = display / social (name, pic, bio, cover, …)
-- Empty-dev: drop overlapping columns directly.

-- Display fields leave auth (live on profile)
ALTER TABLE auth_users DROP COLUMN IF EXISTS name;
ALTER TABLE auth_users DROP COLUMN IF EXISTS profile_pic_url;
ALTER TABLE auth_users DROP COLUMN IF EXISTS bio;

-- Auth fields leave profile (live on auth_users)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS email;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS roles;

-- Index was on profile email
DROP INDEX IF EXISTS idx_user_profiles_email;
DROP INDEX IF EXISTS idx_user_profiles_roles;
