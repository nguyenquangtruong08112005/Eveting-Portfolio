# Phase C6 Admin Postgres Verification

## Scope

- Server repo only: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Branch: `staging`
- Server commit: `b80667e` - `Add Postgres admin repository`
- Mobile repos were not changed.

## Implemented Boundary

- `providers/database/admin.repository.js` now supports:
  - `ADMIN_DATABASE_PROVIDER`
  - fallback `DATABASE_PROVIDER`
  - default `firebase`
- Added `providers/database/postgres.admin.repository.js`.
- Implemented `getPendingEvents(page, limit)` against PostgreSQL `events` table.
- Preserved Firebase-compatible pending event payload shape by preferring `raw_data` and returning `{ id, ...eventData }`.
- Added `npm run db:compare:admin`.

## Verification Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check providers\database\admin.repository.js
node --check providers\database\postgres.admin.repository.js
node --check scripts\compare.admin.firebase-postgres.js
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:migrate&&npm run db:sync:events&&npm run db:compare:admin
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
for /f "delims=" %f in ('rg --files -g "*.js" -g "!node_modules/**"') do @node --check "%f"
```

Result: passed.

## Compare Result

- Firebase events synced to Postgres: 23
- Admin pending first page matched: 2
- Missing in Postgres: 0
- Missing in Firebase: 0
- Different payloads: 0

## Compatibility Notes

- Admin routes and controller responses were not changed.
- Firebase remains the default provider.
- `approveEvent` and `rejectEvent` still use `event.repository`; with `DATABASE_PROVIDER=postgres`, those update Postgres events.
- Elasticsearch indexing and notification behavior were not changed.

## Remaining Risks

- Admin routes currently have auth middleware commented out in `routes/admin.routes.js`; this slice does not change that behavior.
- Admin compare covers pending list read path only; approve/reject write-path should be tested in a controlled fixture before real provider flip.
- Elasticsearch delete/index side effects still need a local-safe verification strategy.

## Next Step

Phase C7 global Postgres provider smoke:

- boot server with `DATABASE_PROVIDER=postgres`
- run bounded route/provider smoke matrix
- identify any remaining selector without Postgres implementation
- keep Firebase packages/config until full deployment cutover is proven
