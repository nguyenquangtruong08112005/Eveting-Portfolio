# Phase P1.4-S3 Commission And Ledger Foundation

Date: 2026-06-20

## Scope

Model money flow by introducing database tables and logic for organizer balances, platform fees, and dynamic platform fee calculations. Update the transaction ledger entry creation to update active balances atomically.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: Antigravity
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `098dbd9e1ac088be4d8af5ad97fe6b2af7347f96` - `feat(backend): implement organizer balances, platform fees, transactional ledger updates, and commission calculation`

## Changed Files

- `Server-2025-Eventing/db/migrations/028_create_balances_and_fees.sql` [NEW]
- `Server-2025-Eventing/src/providers/database/postgres.order.repository.js`
- `Server-2025-Eventing/scripts/smoke.commission-ledger.js` [NEW]

## Behavior

- Created a database migration `028_create_balances_and_fees.sql` defining `organizer_balances` and `platform_fees` (accrued platform earnings balance).
- Updated repository method `createLedgerEntryInTransaction` in `postgres.order.repository.js` to automatically perform transactional UPSERT operations (`ON CONFLICT DO UPDATE`) to increment organizer and platform balances on ledger entry generation.
- Added repository query methods for retrieving organizer and platform fee balances.
- Implemented `smoke.commission-ledger.js` validating baseline platform fee calculations (5% default rate), custom calculations (10% rate set via `organizer_settings`), and correct rollback behavior inside database transactions.

## Verification

Run from `Server-2025-Eventing`:

```cmd
node db/migrate.js
node scripts/smoke.commission-ledger.js
node scripts/smoke.zalopay-callback.js
node scripts/smoke.zalopay-callback-idempotency.js
node scripts/smoke.mobile-contracts.cjs
npm run ci:check
```

Results:
- `db/migrate.js`: success.
- `smoke.commission-ledger.js`: 12 pass, 0 fail.
- `smoke.zalopay-callback.js`: 14 pass, 0 fail.
- `smoke.zalopay-callback-idempotency.js`: 25 pass, 0 fail.
- `smoke.mobile-contracts.cjs`: 17 pass, 0 fail.
- `npm run ci:check`: pass.
