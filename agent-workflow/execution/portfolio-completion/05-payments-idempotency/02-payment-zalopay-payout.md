# Task 05-T2: ZaloPay Gateway Integration, Refund & Payout Safeguards

## 1. Goal
Implement ZaloPay Sandbox Payment Gateway integration, cryptographic webhook signature verification (`HMAC-SHA256`), order status reconciliation, and simulated organizer payout automation with admin approval gates.

## 2. Why
Provides authentic Vietnamese payment method processing while safeguarding platform funds against duplicate charges, concurrent callbacks, and unauthorized payouts. Payout automation ensures organizers can withdraw revenue on a reliable schedule without manual intervention.

## 3. Dependencies
- Task `05-T1` (Core Idempotency Engine).
- PostgreSQL migrations 066-069 applied (payout tables, encrypted bank accounts, status constraints).

## 4. Preconditions
- ZaloPay Sandbox credentials configured (`ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2`, `ZALOPAY_ENDPOINT`).
- `BANK_ACCOUNT_ENCRYPTION_KEY` configured (32 bytes, Base64-encoded) for AES-256-GCM bank account encryption.
- `PAYOUT_WORKERS_ENABLED` (default true) controls the weekly batch and 5-minute reconciliation crons.

## 5. In-Scope / Out-of-Scope

### In-Scope
- `POST /payments/callback` — ZaloPay webhook with HMAC-SHA256 signature verification using `KEY2`.
- `POST /payments/create-order` — ZaloPay order creation, shadow order/payment_attempt persistence.
- `POST /payments/check-status` — Payment status query with ZaloPay, `FOR UPDATE` lock to serialise concurrent callback/check-status races.
- **Simulated payout foundation:** `PUT /organizer/me/payout-bank-account` bank account registration (AES-256-GCM encrypted payload), per-ledger-entry allocation, eligibility (7-day hold after event end), 100,000 VND minimum payout, first payout or >= 10,000,000 VND requires single admin approval.
- **Simulated payout provider:** Deterministic `submitPayout` returns PROCESSING; `getTransferStatus` returns COMPLETED for `sim_payout_*` references. Processing-to-completed transition occurs in the 5-minute reconciliation run. `DETERMINISTIC_PAYOUT_FAILURE=true` forces FAILED status for testing.
- **Weekly batch (Sunday 00:00 Asia/Ho_Chi_Minh):** Auto-discovers eligible organizers, runs `requestPayout` per organizer, counts submissions/skip/errors.
- **5-minute reconciliation:** Recovers stranded `pending_provider_submission` payouts, reconciles `processing` payouts to completed/failed.
- **Organizer payout APIs:** `GET /organizer/me/payout-summary`, `GET /organizer/me/payouts`, `GET /organizer/me/payout-bank-account`, `PUT /organizer/me/payout-bank-account` (with idempotency).
- **Admin payout APIs:** `GET /admin/payouts` (with optional status filter), `POST /admin/payouts/:id/approve` (with idempotency + audit log `payout:approve`).

### Out-of-Scope
- Live bank wire integration (simulated payout workflow only).
- Real ZaloPay sandbox transaction/callback verification (pending — requires local ngrok and deployed staging).
- Refund workflow (`POST /admin/refunds`).
- Payout rejection/reversal endpoints.
- Organizer payout UI on mobile-organizer (beyond the concise payout summary commit 28ab1fd).

## 6. Actual Source Modules / Files

### Server-side payout automation
- `server/src/modules/payments/application/payout.service.js` — `registerBankAccount`, `requestPayout`, `adminApprovePayout`.
- `server/src/modules/payments/infrastructure/config/payout.config.js` — Lazy Base64-decoded 32-byte key from `BANK_ACCOUNT_ENCRYPTION_KEY`.
- `server/src/modules/payments/infrastructure/bank-verify.adapter.js` — Simulated verification; rejects `000000000`.
- `server/src/modules/payments/infrastructure/simulated-payout.provider.js` — `submitPayout`, `getTransferStatus`.
- `server/src/providers/database/postgres.payout.repository.js` — `getEligibleLedgerEntries`, `createPayout`, `createPayoutItem`, `lockAndUpdatePayout`, `getEligibleOrganizers`, `getProcessingPayouts`, `getPendingProviderSubmissionPayouts`, `getPayoutSummaryByOrganizer`, `getPayoutsByOrganizerPaginated`, `getAllPayoutsPaginated`, `getBankAccountSafe`.
- `server/src/jobs/payout.job.js` — `runBatch`, `runReconciliation`, `startPayoutCron`.
- `server/src/server.js` — Bootstraps `startPayoutCron()`.

### Organizer & Admin payout API routes
- `server/src/modules/organizer/api/controller.js` — `getPayoutSummary`, `getPayoutList`, `getBankAccountInfo`, `registerBankAccount`.
- `server/src/modules/organizer/api/routes.js` — 4 payout endpoints.
- `server/src/modules/admin/api/controller.js` — `getPayoutList`, `approvePayout`.
- `server/src/modules/admin/api/routes.js` — 2 payout endpoints.

### Migrations
- `server/db/migrations/066_create_payout_tables.sql` — `payouts`, `payout_items`, `bank_accounts`.
- `server/db/migrations/067_add_bank_accounts_encrypted_payload.sql` — `encrypted_payload`, `masked_display` columns; legacy column `DROP NOT NULL`.
- `server/db/migrations/068_add_payouts_check_constraints.sql` — Named `chk_payouts_amount_positive`, `chk_payouts_status_valid`.
- `server/db/migrations/069_add_payouts_submitting_status.sql` — Adds `submitting` to status CHECK.

## 7. Contracts / Behavior to Preserve
- `X-Idempotency-Key` header enforced on `POST /payments/create-order` and `POST /payments/check-status`.
- ZaloPay callback response format: `{ return_code: 1, return_message: "success" }`.
- No plaintext bank account data ever logged or returned in API responses.
- Provider reference and encrypted payload are store-only; never exposed in organizer/safe DTOs.

## 8. Implementation Steps — Implemented (Runtime Verification Pending)
1. ~~T2A: Payment-status concurrency hardening~~ — `manualCheckPaymentStatus` uses `FOR UPDATE` lock; callback/status race smoke 40/0.
2. ~~T2B: Attendee confirmation polling~~ — `PaymentViewModel` polls every 3s × 8 max, pending-confirmation UI with Refresh.
3. ~~T2C: Check-status idempotency wiring~~ — `idempotency()` middleware added to `POST /payments/check-status`; web and mobile send fresh UUID per check.
4. ~~T2D: Simulated payout foundation~~ — Migrations 066-069, AES-256-GCM, eligibility, admin approval gate, `pending_provider_submission` → `submitting` → `processing` → `completed`/`failed` state machine. Smokes: foundation 19/0, automation 16/0.
5. ~~T2E-1: Payout automation~~ — Weekly batch (Sunday 00:00 Asia/Ho_Chi_Minh), 5-min reconciliation cron, `PAYOUT_WORKERS_ENABLED` toggle.
6. ~~T2E-2: Payout finance APIs~~ — Organizer summary/list/bank endpoints, admin list/approve endpoints. API smoke 28/0.

## 9. Database / Migrations
- Migration 066: `payouts`, `payout_items`, `bank_accounts` tables with CHECK constraints and indexes.
- Migration 067: `encrypted_payload`/`masked_display` columns; legacy columns made nullable.
- Migration 068: Named CHECK constraints for amount and status.
- Migration 069: `submitting` status added to CHECK constraint.
- Migration 065 (T1): Additive idempotency keys with global uniqueness.

Run order: 064 → 065 → 066 → 067 → 068 → 069.

## 10. Security Requirements
- AES-256-GCM encryption of bank account data (`accountNumber` + `accountHolder` as JSON payload).
- HMAC fingerprint derived from encryption key for duplicate detection.
- No plaintext account details in logs, error messages, or API responses.
- `BANK_ACCOUNT_ENCRYPTION_KEY` must be exactly 32 decoded bytes; no insecure production default.
- Static logger messages only for payout operations (no PII, no raw error messages in cron logs).

## 11. Smoke Commands & Evidence
```
node scripts/smoke/smoke.payouts.js                  # 19 passed, 0 failed
node scripts/smoke/smoke.payout-automation.js         # 16 passed, 0 failed
node scripts/smoke/smoke.payout-api.js                # 28 passed, 0 failed
node scripts/smoke/smoke.idempotency.js               # 20 passed, 0 failed
node scripts/smoke/smoke.zalopay-callback-idempotency.js # 40 passed, 0 failed
```

## 12. Acceptance Criteria — Implemented (pending ZaloPay sandbox runtime verification)
- [x] `POST /payments/callback` verifies HMAC-SHA256 signature with `KEY2`.
- [x] Duplicate callbacks idempotent (state machine guard, `FOR UPDATE` lock).
- [x] `POST /payments/check-status` locked against concurrent callback race.
- [x] AES-256-GCM bank account registration with masked display, fingerprint dedup.
- [x] Simulated bank verification rejects `000000000`.
- [x] Payout eligibility requires 7 days after event end.
- [x] Minimum payout amount: 100,000 VND.
- [x] First payout or amount >= 10,000,000 VND requires admin approval.
- [x] Weekly batch discovers eligible organizers, skips admin-approval-required until next cycle.
- [x] 5-minute reconciliation recovers stranded `pending_provider_submission` and completes processing payouts.
- [x] No double-completion: `lockAndUpdatePayout` with conditional status transition.
- [x] Organizer payout summary includes `eligibleNetAmount`, `pendingApprovalAmount`, `processingAmount`, `completedAmount`, `nextScheduledPayoutAt`.
- [x] Paginated organizer/admin payout lists exclude `keyedFingerprint` and `rawData`.
- [x] Admin payout approval with idempotency and audit logging (`payout:approve`).

## 13. Rollback / Feature-Flag Strategy
- `PAYOUT_WORKERS_ENABLED=false` disables weekly batch and reconciliation crons.
- `BANK_ACCOUNT_ENCRYPTION_KEY` absence prevents `registerBankAccount` and `requestPayout` — safe degrade.

## 14. Required Artifacts / Handoff Report
- Server commits: `d3ad9c3` (simulated payout foundation), `24a06b7` (automated simulated payouts), `c1626b2` (payout finance APIs).
- Web commit: `769da37` (organizer payout dashboard).
- Mobile-organizer commit: `28ab1fd` (concise payout summary).

## 15. Blocker Questions
- Resolved: payout rules finalized (7-day hold, 100K minimum, first/high 10M+ admin approval).
- Pending: manual local ngrok and deployed staging ZaloPay sandbox transaction and callback verification.
- Not in scope: refund workflow, payout rejection/reversal, live bank wire integration.
