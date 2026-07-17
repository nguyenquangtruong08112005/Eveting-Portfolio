-- Migration: 040_merge_vouchers_into_promotions
-- Description: 3NF N4a — single discount SoT (promotions); drop vouchers.
-- Empty-dev: no row merge.

ALTER TABLE promotions ADD COLUMN IF NOT EXISTS discount_type TEXT;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS discount_value NUMERIC;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS max_discount NUMERIC;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS min_order NUMERIC DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_promotions_discount_type'
    ) THEN
        ALTER TABLE promotions
            ADD CONSTRAINT chk_promotions_discount_type
            CHECK (discount_type IS NULL OR discount_type IN ('percent', 'fixed'));
    END IF;
END $$;

DROP TABLE IF EXISTS vouchers CASCADE;
