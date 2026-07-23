-- W1.4: Voucher system for promo codes
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC NOT NULL,
  max_discount NUMERIC,
  min_order NUMERIC DEFAULT 0,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  event_id TEXT REFERENCES events(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_event_id ON vouchers(event_id);
