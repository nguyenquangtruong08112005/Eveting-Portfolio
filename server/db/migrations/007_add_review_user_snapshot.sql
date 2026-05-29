-- Migration: 007_add_review_user_snapshot
-- Description: Add user snapshot columns to reviews table so that
--              user {name, profilePicUrl} can be stored at review time
--              before the users domain is fully migrated.

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS user_name            TEXT,
  ADD COLUMN IF NOT EXISTS user_profile_pic_url TEXT;
