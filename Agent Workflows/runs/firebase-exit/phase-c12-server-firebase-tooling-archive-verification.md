# Phase C12 Server Firebase Tooling Archive Verification

## Scope

- Server repo only: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Branch: `staging`
- Server commit: `8e2437c` - `Archive Firebase migration tooling`
- Mobile repos were not changed.

## Implemented Boundary

- Moved Firebase-dependent sync/compare scripts out of runtime `scripts/`:
  - from `scripts/compare.*firebase-postgres.js`
  - from `scripts/sync.*firebase-to-postgres.js`
  - to `archive/firebase-migration/scripts/`
- Kept root `package.json` script names stable by updating script paths.
- Moved tracked Firebase Functions files out of runtime `functions/`:
  - to `archive/firebase-functions/`
- Added archive README files explaining these are Firebase-dependent migration/reference tooling, not runtime server code.
- Did not remove `firebase-admin`; adapters and archived migration tooling still require it.

## Verification Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
for /f "delims=" %f in ('dir /b archive\firebase-migration\scripts\*.js') do @node --check "archive\firebase-migration\scripts\%f"
node --check archive\firebase-functions\index.js
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:smoke:lazy-providers&&npm run db:smoke:postgres-provider&&npm run db:compare:admin&&npm run db:compare:events
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
for /f "delims=" %f in ('rg --files -g "*.js" -g "!node_modules/**"') do @node --check "%f"
```

Result: passed.

## Compatibility Notes

- Existing `npm run db:sync:*` and `npm run db:compare:*` commands still work.
- Runtime smoke with Postgres/backend providers still works.
- Firebase tooling is now clearly isolated under `archive/`.
- No mobile-facing API contract changed.

## Remaining Risks

- Archived scripts still intentionally require Firebase for one-off migration/compare tasks.
- Firebase adapters remain default provider path unless env opts into Postgres/backend/OneSignal.
- Mobile Firebase client migration is still required before Firebase can be removed end to end.

## Next Step

Start Hướng 1 mobile migration:

- audit current dirty mobile changes before editing
- introduce backend auth token storage/interceptor without deleting Firebase flow immediately
- add backend media upload path
- plan OneSignal subscription/external-id registration
