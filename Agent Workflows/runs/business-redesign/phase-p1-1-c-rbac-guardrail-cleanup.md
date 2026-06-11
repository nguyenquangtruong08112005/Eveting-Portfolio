# Phase P1.1-C - RBAC Guardrail Cleanup

Date: 2026-06-12

## Status

Complete on `Server-2025-Eventing` branch `staging`.

Server commit:

- `04f653d` - `refactor: align rbac guards with shared errors`

## Scope

Cleaned up the recent RBAC/authz route-guard code to better follow shared error/logger conventions while preserving legacy route contracts.

Changed server files:

- `src/shared/middleware/authz.middleware.js`
- `src/shared/middleware/admin.middleware.js`
- `src/shared/middleware/auth.middleware.js`

## Changes

- Added shared error class usage for legacy guard paths:
  - `UnauthorizedError`
  - `ForbiddenError`
  - `InternalServerError`
- Added `sendLegacyError(res, appError, legacyMessage)` as a single compatibility helper.
- Preserved exact legacy response body shape for smoke-protected guards.
- Replaced new `console.error` calls in RBAC/authz middleware with shared logger calls.
- Added logging for the `isAdmin` catch path while preserving the old `500` body.

## Compatibility Notes

- Admin `403` remains `{ error: 'Forbidden: Require Admin Privileges.' }`.
- Organizer `403` remains `{ error: 'Forbidden: User does not have organizer privileges.' }`.
- Organizer direct no-user `401` remains `{ error: 'Unauthorized: No authenticated user.' }`.
- `requireRole` legacy response bodies remain unchanged.
- Existing route imports remain unchanged.
- Global structured error response was intentionally not forced into these legacy guards because that would change mobile/route-facing payloads.

## DB / SQL / Security Notes

- Zero DB calls added to `isAdmin`, `isOrganizer`, or `requireRole`.
- `isAdmin`, `isOrganizer`, and `requireRole` only inspect `req.user`.
- No SQL was added or changed.
- No new SQL injection surface was introduced.
- Existing DB-calling RBAC helpers were not changed in this slice.

## Verification

Commands run:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
npm run ci:check
npm run db:smoke:mobile-contracts
git diff --check
codegraph sync .
codegraph status
```

Results:

- JavaScript syntax check passed.
- `npm run db:smoke:authz-middleware` passed with 23 pass, 0 fail.
- `npm run db:smoke:lazy-providers` passed.
- `npm run ci:check` passed.
- `npm run db:smoke:mobile-contracts` passed with 15 pass, 0 fail, 2 skip.
- `git diff --check` passed.
- Server CodeGraph is up to date.

## Next Step

Proceed to P1.2 Event Lifecycle Foundation.

Worker prompt must follow `phase-p-decisions-and-guardrails.md`:

- Introduce canonical lifecycle states and legacy status mapping.
- Keep mobile-facing behavior stable.
- Report DB round trips.
- Report index/security/query implications.
- Use shared errors/logger/config helpers.
