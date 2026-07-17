# Phase P1.1-B - RBAC Route Guard Pilot

Date: 2026-06-11

## Status

Complete on `Server-2025-Eventing` branch `staging`.

Server commit:

- `5892c4d` - `feat: wire rbac role guards`

## Scope

Wired the RBAC foundation into the smallest existing route-guard surface without changing controllers, route paths, route ordering, or mobile-facing response payloads.

Changed server files:

- `src/shared/middleware/authz.middleware.js`
- `src/shared/middleware/admin.middleware.js`
- `src/shared/middleware/auth.middleware.js`
- `scripts/smoke.authz-middleware.js`
- `package.json`

## Added / Changed

- Added `userHasRole(req, role)` helper to `authz.middleware.js`.
- Refactored `requireRole` to share the same role-check helper.
- Updated `isAdmin` to keep `ADMIN_UID` fallback first, then allow `admin` role from `req.user.roles`.
- Updated `isOrganizer` to preserve legacy `req.user.role` compatibility and use the shared role helper for `req.user.roles`.
- Added in-memory authz middleware smoke coverage.
- Added `npm run db:smoke:authz-middleware` and included it in `npm run ci:check`.

## Compatibility Notes

- Admin routes still import and use `isAdmin`; route files were not rewired.
- Organizer routes still import and use `isOrganizer`; route files were not rewired.
- Existing admin 403 body remains `Forbidden: Require Admin Privileges.`
- Existing organizer 403 body remains `Forbidden: User does not have organizer privileges.`
- `ADMIN_UID` still works exactly as the first admin fallback.
- Direct `isOrganizer` calls with no `req.user` now return 401; mounted routes already run `verifyAuthToken` first, so mobile route behavior remains guarded by the same auth middleware path.

## Verification

Commands run:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
node --check src\shared\middleware\authz.middleware.js
node --check src\shared\middleware\admin.middleware.js
node --check src\shared\middleware\auth.middleware.js
node --check scripts\smoke.authz-middleware.js
git diff --check
npm run ci:check
npm run db:smoke:authz-middleware
npm run db:smoke:mobile-contracts
codegraph sync .
codegraph status
```

Results:

- JavaScript syntax checks passed.
- `git diff --check` passed.
- `npm run ci:check` passed.
- `npm run db:smoke:authz-middleware` passed with 23 pass, 0 fail.
- `npm run db:smoke:mobile-contracts` passed with 15 pass, 0 fail, 2 skip.
- Server CodeGraph is up to date.

## Next Decision Point

P1.2 should not start blindly because it requires product/business ordering.

Recommended options:

1. Event lifecycle foundation: draft/pending/approved/published/rejected/cancelled transitions and organizer/admin approvals.
2. Staff/team management: organization membership APIs and organizer staff roles.
3. Ticket/order/payment hardening: order state model, seat capacity locks, payment transaction consistency.

Manager recommendation: start with Event lifecycle foundation, because staff roles and ticket/payment rules both depend on clearer event ownership and event state semantics.
