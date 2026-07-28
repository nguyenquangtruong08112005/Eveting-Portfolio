-- Phase 07 slice C: transaction-safe promotion and voucher business rules.
-- Promotions remain the single discount source of truth established in 040.

ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS ticket_usage_limit INTEGER,
  ADD COLUMN IF NOT EXISTS used_ticket_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS per_user_limit INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS min_ticket_quantity INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_ticket_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true;

UPDATE promotions
SET discount_type = CASE
      WHEN discount_type IS NOT NULL THEN discount_type
      WHEN data->>'discountType' = 'amount' THEN 'fixed'
      WHEN data->>'discountType' IN ('fixed', 'percent') THEN data->>'discountType'
      WHEN data ? 'discountPercent' THEN 'percent'
      WHEN data ? 'fixedDiscountVnd' THEN 'fixed'
      ELSE discount_type
    END,
    discount_value = CASE
      WHEN discount_value IS NOT NULL THEN discount_value
      WHEN COALESCE(data->>'discountValue', '') ~ '^[0-9]+(\.[0-9]+)?$'
        THEN (data->>'discountValue')::numeric
      WHEN COALESCE(data->>'discountPercent', '') ~ '^[0-9]+(\.[0-9]+)?$'
        THEN (data->>'discountPercent')::numeric / 100
      WHEN COALESCE(data->>'fixedDiscountVnd', '') ~ '^[0-9]+$'
        THEN (data->>'fixedDiscountVnd')::numeric
      ELSE discount_value
    END,
    max_discount = CASE
      WHEN max_discount IS NOT NULL THEN max_discount
      WHEN COALESCE(data->>'maxDiscount', '') ~ '^[0-9]+$'
        THEN (data->>'maxDiscount')::numeric
      WHEN COALESCE(data->>'maxDiscountVnd', '') ~ '^[0-9]+$'
        THEN (data->>'maxDiscountVnd')::numeric
      ELSE max_discount
    END,
    min_ticket_quantity = CASE
      WHEN COALESCE(data->>'minTicketQuantity', '') ~ '^[1-9][0-9]*$'
        THEN (data->>'minTicketQuantity')::integer
      ELSE min_ticket_quantity
    END,
    used_ticket_count = GREATEST(used_ticket_count, used_count);

UPDATE promotions SET per_user_limit = 1 WHERE per_user_limit IS NULL;
ALTER TABLE promotions ALTER COLUMN per_user_limit SET DEFAULT 1;
ALTER TABLE promotions ALTER COLUMN per_user_limit SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_promotions_usage_counts'
  ) THEN
    ALTER TABLE promotions
      ADD CONSTRAINT chk_promotions_usage_counts
      CHECK (
        used_count >= 0
        AND used_ticket_count >= 0
        AND (usage_limit IS NULL OR usage_limit >= 0)
        AND (ticket_usage_limit IS NULL OR ticket_usage_limit > 0)
        AND (per_user_limit IS NULL OR per_user_limit > 0)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_promotions_ticket_quantity_scope'
  ) THEN
    ALTER TABLE promotions
      ADD CONSTRAINT chk_promotions_ticket_quantity_scope
      CHECK (
        min_ticket_quantity > 0
        AND (max_ticket_quantity IS NULL OR max_ticket_quantity >= min_ticket_quantity)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_promotions_vnd_amounts'
  ) THEN
    ALTER TABLE promotions
      ADD CONSTRAINT chk_promotions_vnd_amounts
      CHECK (
        min_order >= 0
        AND (max_discount IS NULL OR max_discount >= 0)
        AND (
          discount_type <> 'fixed'
          OR (
            discount_value >= 0
            AND discount_value = trunc(discount_value)
            AND (max_discount IS NULL OR max_discount = trunc(max_discount))
            AND min_order = trunc(min_order)
          )
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promotions_code_upper
  ON promotions (UPPER(code));

CREATE INDEX IF NOT EXISTS idx_promotions_public_window
  ON promotions (is_public, is_enabled, valid_from, valid_until)
  WHERE is_public = true AND is_enabled = true;

CREATE TABLE IF NOT EXISTS voucher_usages (
  id TEXT PRIMARY KEY,
  promotion_id TEXT NOT NULL
    REFERENCES promotions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL
    REFERENCES auth_users(id) ON DELETE RESTRICT,
  order_id TEXT NOT NULL
    REFERENCES orders(id) ON DELETE RESTRICT,
  event_id TEXT
    REFERENCES events(id) ON DELETE SET NULL,
  organizer_id TEXT
    REFERENCES auth_users(id) ON DELETE SET NULL,
  ticket_quantity INTEGER NOT NULL,
  subtotal_amount BIGINT NOT NULL,
  discount_amount BIGINT NOT NULL,
  total_amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_voucher_usages_order UNIQUE (order_id),
  CONSTRAINT chk_voucher_usages_status
    CHECK (status IN ('reserved', 'redeemed', 'released')),
  CONSTRAINT chk_voucher_usages_amounts
    CHECK (
      ticket_quantity > 0
      AND subtotal_amount >= 0
      AND discount_amount >= 0
      AND discount_amount <= subtotal_amount
      AND total_amount = subtotal_amount - discount_amount
    )
);

CREATE INDEX IF NOT EXISTS idx_voucher_usages_promotion_user_status
  ON voucher_usages (promotion_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_voucher_usages_promotion_status
  ON voucher_usages (promotion_id, status);
