# Phase C7 Postgres Provider Smoke Verification

## Scope

- Server repo only: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Branch: `staging`
- Server commit: `874d8d1` - `Add Postgres provider smoke`
- Mobile repos were not changed.

## Implemented Boundary

- Added `npm run db:smoke:postgres-provider`.
- Smoke starts `app.js` with:
  - `DATABASE_PROVIDER=postgres`
  - `AUTH_PROVIDER=backend`
  - `STORAGE_PROVIDER=local`
  - local `DATABASE_URL`
- Smoke verifies the server boots without provider selector errors.
- Smoke calls bounded read routes:
  - `GET /`
  - `GET /events?page=1&limit=1`
  - `GET /profiles?limit=1`
  - `GET /admin/events/pending?page=1&limit=5`
- Output redacts database password and token-like strings.

## Verification Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check scripts\smoke.postgres-provider.js
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
npm run db:smoke:postgres-provider
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
for /f "delims=" %f in ('rg --files -g "*.js" -g "!node_modules/**"') do @node --check "%f"
```

Result: passed.

## Smoke Result

- Server booted on local test port with `DATABASE_PROVIDER=postgres`.
- `GET /` returned 200 and `Welcome`.
- `GET /events?page=1&limit=1` returned 200 and an `events` array.
- `GET /profiles?limit=1` returned 200 and a `profiles` array.
- `GET /admin/events/pending?page=1&limit=5` returned 200 and an array.

## Compatibility Notes

- This is a boot/read smoke only; it does not flip production defaults.
- Firebase packages/config remain present.
- Mobile-facing route contracts were not changed.
- The smoke intentionally avoids protected organizer/user write flows.

## Remaining Risks

- Full write-path smoke matrix is still needed before production provider flip.
- Payment, Elasticsearch, reminder job, and notification side effects need controlled verification.
- Mobile auth migration and user profile linking remain incomplete.
- OneSignal provider still needs an app-level integration test with real subscription/external IDs.

## Next Step

Phase C8 controlled write-path/provider-flip verification:

- run existing compare scripts for all migrated domains after sync
- test backend auth plus protected write flows with Postgres provider in controlled fixtures
- decide deployment env split before any Firebase package/config removal
