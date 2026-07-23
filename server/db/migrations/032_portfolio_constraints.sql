-- Migration: 032_portfolio_constraints
-- Description: Portfolio V1 — one review per user per event.
-- Dependency: 031 FKs on reviews
-- Deferred tables (not dropped): seat_maps, seats, seat_holds, ledger_entries,
--   organizer_balances, dual promotions/vouchers — see PORTFOLIO_V1_SCOPE.md

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_reviews_user_event'
  ) THEN
    -- Keep one row per (user_id, event_id): highest created_at, then min ctid
    DELETE FROM reviews r
    WHERE EXISTS (
      SELECT 1 FROM reviews r2
      WHERE r2.user_id = r.user_id
        AND r2.event_id = r.event_id
        AND (
          r2.created_at > r.created_at
          OR (r2.created_at = r.created_at AND r2.ctid < r.ctid)
        )
    );

    ALTER TABLE reviews
      ADD CONSTRAINT uq_reviews_user_event UNIQUE (user_id, event_id);
  END IF;
END $$;
