# Phase C8 Postgres Write Paths Verification

## Scope

- Server repo only: `D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing`
- Branch: `staging`
- Server commit: `8aedc00` - `Add Postgres write path smoke`
- Mobile repos were not changed.

## Implemented Boundary

- Added `npm run db:smoke:postgres-write-paths`.
- Added controlled synthetic admin write-path smoke:
  - creates synthetic pending event for approve path
  - calls `adminService.approveEvent`
  - verifies Postgres `status=active`, `visibility=public`, `approvedAt`, `lastUpdatedAt`
  - creates synthetic pending event for reject path
  - calls `adminService.rejectEvent`
  - verifies Postgres `status=rejected`, `rejectReason`, `rejectedAt`, `lastUpdatedAt`
  - cleans synthetic rows in `finally`
- Adjusted Postgres event update behavior so unknown Firestore-style update fields are merged into `raw_data` instead of being blindly mapped to non-existent snake_case columns.

## Verification Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check providers\database\postgres.event.repository.js
node --check scripts\smoke.postgres-write-paths.js
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:smoke:postgres-write-paths
```

Result: passed.

Additional regression smoke:

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:smoke:transactions&&npm run db:smoke:storage-media&&npm run db:smoke:postgres-provider&&npm run db:smoke:auth&&npm run db:compare:events&&npm run db:compare:admin
```

Result: passed.

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
for /f "delims=" %f in ('rg --files -g "*.js" -g "!node_modules/**"') do @node --check "%f"
```

Result: passed.

## Smoke Result

- Transaction rollback/commit smoke passed.
- Storage media upload/read smoke passed.
- Global Postgres provider boot/read smoke passed.
- Backend auth smoke passed.
- Events compare still matched 23 events.
- Admin pending compare still matched 2 events.
- Admin approve/reject synthetic write-path passed.

## Compatibility Notes

- API routes and mobile-facing payloads were not changed.
- Firebase remains available as default provider unless env opts into Postgres/backend auth/storage.
- Elasticsearch was not required to be running; existing admin service caught indexing failures.
- Synthetic events used no `featuredProfileIds`, so push side effects were avoided.

## Remaining Risks

- Real admin approve with featured profiles still needs push-provider verification.
- Existing admin routes have auth middleware commented out; this slice preserves that behavior.
- Mobile auth migration/profile linking still blocks Firebase Auth removal.
- Full production cutover still needs deployment env sequencing and rollback plan.

## Next Step

Phase C9 Firebase-removal blocker audit:

- enumerate remaining direct Firebase imports
- separate safe adapters/sync scripts from runtime blockers
- decide which defaults can flip in local/dev first
- list exact code/env changes required before removing Firebase packages/config
