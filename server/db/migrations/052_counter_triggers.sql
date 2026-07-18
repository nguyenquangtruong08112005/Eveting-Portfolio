-- Migration: 052_counter_triggers
-- W2: keep follower/following counters in sync with user_follows.

CREATE OR REPLACE FUNCTION trg_user_follows_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles SET following_count = following_count + 1, updated_at = NOW()
      WHERE id = NEW.follower_id;
    UPDATE user_profiles SET followers_count = followers_count + 1, updated_at = NOW()
      WHERE id = NEW.followee_id;
    UPDATE featured_profiles SET follower_count = follower_count + 1, updated_at = NOW()
      WHERE id = NEW.followee_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_profiles SET following_count = GREATEST(following_count - 1, 0), updated_at = NOW()
      WHERE id = OLD.follower_id;
    UPDATE user_profiles SET followers_count = GREATEST(followers_count - 1, 0), updated_at = NOW()
      WHERE id = OLD.followee_id;
    UPDATE featured_profiles SET follower_count = GREATEST(follower_count - 1, 0), updated_at = NOW()
      WHERE id = OLD.followee_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_follows_ai ON user_follows;
DROP TRIGGER IF EXISTS trg_user_follows_ad ON user_follows;

CREATE TRIGGER trg_user_follows_ai
  AFTER INSERT ON user_follows
  FOR EACH ROW EXECUTE FUNCTION trg_user_follows_counters();

CREATE TRIGGER trg_user_follows_ad
  AFTER DELETE ON user_follows
  FOR EACH ROW EXECUTE FUNCTION trg_user_follows_counters();

-- Points balance from loyalty ledger (profile only; membership optional)
CREATE OR REPLACE FUNCTION trg_loyalty_points_sync()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
    SET points = GREATEST(COALESCE(points, 0) + NEW.points, 0), updated_at = NOW()
    WHERE id = NEW.user_id;
  UPDATE user_memberships
    SET points_balance = points_balance + NEW.points,
        lifetime_points = lifetime_points + GREATEST(NEW.points, 0),
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_loyalty_points_ai ON loyalty_points_ledger;
CREATE TRIGGER trg_loyalty_points_ai
  AFTER INSERT ON loyalty_points_ledger
  FOR EACH ROW EXECUTE FUNCTION trg_loyalty_points_sync();
