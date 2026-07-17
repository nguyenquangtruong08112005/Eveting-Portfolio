# Phase C4 Backend Auth Route Verification

## Scope

- Server repo only: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Branch: `staging`
- Server commit: `ca2ad2e` - `Wire backend auth routes`
- Mobile repos were not changed.

## Implemented Boundary

- Mounted backend auth routes at:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `POST /auth/logout-all`
  - same router also mounted under `/api/auth/*`
- Added controller wiring to existing `services/auth.service.js`.
- Kept Firebase auth compatibility by leaving provider selection behind `AUTH_PROVIDER`.
- Updated auth middleware so `AUTH_PROVIDER=backend` reads roles from verified backend JWT claims instead of Firebase user-role lookup.
- Added `npm run db:smoke:auth` for local backend auth smoke verification.

## Verification Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check app.js
node --check controllers\auth.controller.js
node --check middleware\auth.middleware.js
node --check routes\auth.routes.js
node --check scripts\smoke.auth.js
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:migrate&&npm run db:smoke:auth
```

Result: passed.

## Smoke Coverage

- `/auth/register` returns 201 and user payload without password/hash.
- `/auth/login` returns 200 and user payload without password/hash.
- `/auth/refresh` rotates refresh token.
- `/auth/logout` revokes one refresh token.
- Reusing revoked refresh token returns 401.
- Invalid backend bearer token on `/auth/logout-all` returns 403.
- Valid backend bearer token on `/auth/logout-all` revokes all user sessions.
- Refresh after logout-all returns 401.
- Smoke output redacts database password and access/refresh tokens.

## Compatibility Notes

- Firebase remains available; backend auth is active only when `AUTH_PROVIDER=backend`.
- Existing protected routes continue to use Firebase role lookup unless `AUTH_PROVIDER=backend`.
- New backend-auth users are written to `auth_users` / `auth_sessions`; mobile-facing profile migration into `user_profiles` is still pending.
- Auth payloads are new backend endpoints; existing mobile Firebase token flow is not changed in this slice.

## Remaining Risks

- Full mobile auth migration still needs UID/profile linking and deployment-order planning.
- Existing user/profile routes may not find backend-auth-only users until profile sync or profile creation is wired.
- Access-token revocation is not implemented; logout revokes refresh sessions, while issued access tokens remain valid until expiry.
- Auth routes are mounted at both `/auth` and `/api/auth`; keep this documented before mobile contract decisions.

## Next Step

Phase C5 storage upload/read wiring:

- wire storage provider into backend media upload/read path
- keep Firebase/default behavior stable unless provider env opts in
- verify local/minio-compatible path before any AWS/R2 provider switch
