-- Migration 079: Allow idempotency rows to represent an active request.
-- Migration 026 made these cached-response fields mandatory. Runtime inserts an
-- IN_PROGRESS row before a response exists, so completed-response fields must
-- remain nullable until the response is finalized.

ALTER TABLE IF EXISTS idempotency_keys
    ALTER COLUMN response_code DROP NOT NULL,
    ALTER COLUMN response_body DROP NOT NULL;
