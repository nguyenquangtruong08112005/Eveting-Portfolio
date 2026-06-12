# Phase P1.3-S3 Event Raw-Data Update Hardening

Date: 2026-06-12

## Scope

Server-only event repository raw_data dot-notation update logic hardening. Group and chain nested JSONB updates (such as ticket type availability changes) to avoid conflicting or overwritten assignments within a single SQL statement.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: Antigravity
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `c62fecccd1cd35ee0377dad62de438b4c0e5156c` - `feat: harden event raw_data updates and support repeated booking`

## Changed Files

- `Server-2025-Eventing/package.json`
- `Server-2025-Eventing/src/providers/database/postgres.event.repository.js`
- `Server-2025-Eventing/scripts/smoke.repeated-booking.js` [NEW]

## Behavior

- `updateEvent` now correctly translates all standard fields and nested dot-notation fields into aggregated expressions grouped by targeted database column.
- Multiple updates to a single JSONB column (such as nested ticket type availability changes) are composed into a single statement using nested `jsonb_set` calls.
- `raw_data` updates are consolidated into a single base merge (`COALESCE(raw_data, '{}'::jsonb) || $rawMerge::jsonb`) and wrapped sequentially in nested `jsonb_set` calls for every dot-notation field.
- This prevents PostgreSQL from overriding multiple assignments to the same column in a single statement, ensuring repeated bookings correctly decrement availability in both typed columns and `raw_data` without corruption or data loss.

## DB Round Trip Impact

- Identical DB round trips. The update is compiled into a single unified SQL query just as before, but handles JSONB modifications safely in a single assignment expression per column instead of multiple overwriting ones.

## Verification

Run from `Server-2025-Eventing`:

```cmd
npm run db:smoke:repeated-booking
npm run db:smoke:order-wiring
npm run db:smoke:events
npm run db:smoke:tickets
npm run db:smoke:mobile-contracts
npm run ci:check
```

Results:
- `npm run db:smoke:repeated-booking`: 21 pass, 0 fail.
- `npm run db:smoke:order-wiring`: 58 pass, 0 fail.
- `npm run db:smoke:events`: pass.
- `npm run db:smoke:tickets`: pass.
- `npm run db:smoke:mobile-contracts`: 15 pass, 0 fail, 2 skip.
- `npm run ci:check`: pass (runs check-js-syntax and all core smookes).
- `git diff --check`: passed.
- `codegraph sync .`: Synced successfully.

## Risk / Follow-Up

No remaining risk. The pre-existing data corruption/overwriting bug is resolved.
We can proceed directly to Phase P1.3-S4: Inventory Locking and Idempotent Booking.
