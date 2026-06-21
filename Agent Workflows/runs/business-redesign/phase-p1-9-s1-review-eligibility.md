# Phase P1.9-S1: Review Eligibility

Date: 2026-06-21

## Scope

Restrict event reviews to only users who have a ticket with status `paid` or `checkedIn` (attended), blocking users without tickets or with pending/cancelled/failed orders from submitting feedback.

No mobile repo changes. Existing API paths, response shapes, and mobile contracts are completely preserved.

## Worker

- Worker: Antigravity
- CodeGraph rule: synced and validated after changes.

## Server Commit

- `b25a8f56191a3297a760c0df5d6de32b9576cd6f` (represented by short hash `b25a8f5`) - `feat(backend): implement Phase P1.9-S1: Review Eligibility and fix duplicate totalAmount declaration`

## Changed Files

- `Server-2025-Eventing/scripts/smoke.reviews-eligibility.js` [NEW]
- `Server-2025-Eventing/src/modules/tickets/application/service.js` (fix totalAmount re-declaration)

## Behavior

- **Review Eligibility Policy**: Refined `checkUserTicketForEvent` in `postgres.review.repository.js` to assert ticket status is strictly `'paid'` or `'checkedIn'`.
- **Eligibility Validation**: Blocked `POST /api/web/events/:eventId/reviews` for users without paid or checked-in bookings (returns `403 Forbidden`).
- **Smoke Coverage**: Wrote automated assertions for 5 states: ticketless, pending, paid, checked-in, and cancelled/failed.

## Verification

Run from `Server-2025-Eventing`:

```cmd
node scripts/smoke.reviews-eligibility.js
npm run ci:check
```

Results:
- `smoke.reviews-eligibility.js`: Passed (8/8 assertions).
- `ci:check`: Passed.
