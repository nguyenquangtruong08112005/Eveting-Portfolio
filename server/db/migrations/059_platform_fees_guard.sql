-- Migration: 059_platform_fees_guard
-- W5: guard singleton platform fees row

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_platform_fees_singleton') THEN
    ALTER TABLE platform_fees
      ADD CONSTRAINT chk_platform_fees_singleton
      CHECK (id = 'platform');
  END IF;
END $$;

INSERT INTO platform_fees (id, balance, updated_at)
VALUES ('platform', 0.00, NOW())
ON CONFLICT (id) DO NOTHING;
