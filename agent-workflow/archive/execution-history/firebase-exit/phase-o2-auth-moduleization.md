# Phase O2 - Auth Moduleization Slice

Date: 2026-06-05

Status: complete for auth domain slice.

## Scope

- Server-only.
- Auth domain only.
- No mobile contract changes.
- No route path changes.
- No response payload changes.
- No provider/env/database changes.

## Changed

- Added `src/modules/auth/`:
  - `auth.routes.js`
  - `auth.controller.js`
  - `auth.service.js`
  - `index.js`
- Kept compatibility shims:
  - `src/routes/auth.routes.js`
  - `src/controllers/auth.controller.js`
  - `src/services/auth.service.js`

## Compatibility

The existing application import path still works because `src/routes/auth.routes.js` re-exports the module router. Existing internal imports of auth controller/service also still work through shims.

Preserved routes:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/google-login`
- `POST /auth/facebook-login`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`
- `POST /auth/email-verification/request`
- `POST /auth/email-verification/confirm`

## Verification

- `node --check` for changed auth module/shim files: passed.
- `git diff --check`: passed.
- `npm run ci:check`: passed.
- `npm run db:smoke:auth`: passed.
- `codegraph sync . && codegraph status .`: passed, 144 files indexed in server repo.

## Next Moduleization Slices

Recommended order:

1. `users`
2. `events`
3. `tickets/payments`
4. `media/storage`
5. `notifications`
6. `organizer/admin`

Do not moduleize all domains in one change. Keep shims until every route import is migrated and verified.
