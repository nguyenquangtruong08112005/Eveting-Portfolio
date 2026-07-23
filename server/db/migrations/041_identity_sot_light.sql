-- Migration: 041_identity_sot_light
-- Description: 3NF N4b — identity SoT: profile email/name remain for display
-- but roles default aligned; document auth_users as authz SoT.
-- Empty-dev: drop duplicate profile.roles is too invasive for app; keep column
-- but stop treating it as authz (app change). Optional: make profile email nullable defaults.

-- Align default roles label on profiles to match common attendee product language
ALTER TABLE user_profiles ALTER COLUMN roles SET DEFAULT '{attendee}';

-- Ensure every profile is 1:1 with auth (already FK). No further schema drops here.
