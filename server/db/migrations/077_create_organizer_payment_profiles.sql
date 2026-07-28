-- Migration 077: Organizer bank/tax profiles and VAT invoice requests.

CREATE TABLE IF NOT EXISTS organizer_payment_profiles (
    organizer_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    encrypted_bank_account TEXT NOT NULL,
    masked_bank_account TEXT NOT NULL,
    bank_fingerprint TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    bank_branch TEXT NOT NULL DEFAULT '',
    red_invoice_enabled BOOLEAN NOT NULL DEFAULT false,
    business_type TEXT NOT NULL
        CHECK (business_type IN ('individual', 'company', 'household')),
    registered_address TEXT NOT NULL,
    tax_number TEXT NOT NULL DEFAULT '',
    verification_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verification_note TEXT,
    kyc_required BOOLEAN NOT NULL DEFAULT true,
    kyc_revision INTEGER NOT NULL DEFAULT 1 CHECK (kyc_revision > 0),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizer_payment_profile_bank_fingerprint
    ON organizer_payment_profiles (bank_fingerprint);
CREATE INDEX IF NOT EXISTS idx_organizer_payment_profile_verification
    ON organizer_payment_profiles (verification_status, kyc_required);

CREATE OR REPLACE FUNCTION organizer_payment_profile_require_rekyc()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.full_name IS DISTINCT FROM OLD.full_name
       OR NEW.bank_fingerprint IS DISTINCT FROM OLD.bank_fingerprint
       OR NEW.bank_name IS DISTINCT FROM OLD.bank_name
       OR NEW.bank_branch IS DISTINCT FROM OLD.bank_branch
       OR NEW.business_type IS DISTINCT FROM OLD.business_type
       OR NEW.registered_address IS DISTINCT FROM OLD.registered_address
       OR NEW.tax_number IS DISTINCT FROM OLD.tax_number THEN
        NEW.verification_status := 'PENDING';
        NEW.verification_note := NULL;
        NEW.kyc_required := true;
        NEW.kyc_revision := OLD.kyc_revision + 1;
        NEW.verified_at := NULL;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizer_payment_profile_require_rekyc
    ON organizer_payment_profiles;
CREATE TRIGGER trg_organizer_payment_profile_require_rekyc
BEFORE UPDATE ON organizer_payment_profiles
FOR EACH ROW
EXECUTE FUNCTION organizer_payment_profile_require_rekyc();

CREATE TABLE IF NOT EXISTS tax_invoice_requests (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    organizer_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    requester_user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    tax_number TEXT NOT NULL,
    billing_address TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'REQUESTED'
        CHECK (status IN ('REQUESTED', 'PROCESSING', 'ISSUED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_invoice_requests_organizer_status
    ON tax_invoice_requests (organizer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tax_invoice_requests_event
    ON tax_invoice_requests (event_id, created_at DESC);
