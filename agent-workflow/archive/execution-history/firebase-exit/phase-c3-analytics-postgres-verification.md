# Phase C3 Analytics Postgres Verification

Date: 2026-05-29

## Scope

- Server repo only: `Server-2025-Eventing`
- Branch: `staging`
- Commit: `0af0740` - `Add Postgres analytics adapter`
- Domain: analytics

## Changes Verified

- Added PostgreSQL `analytics` schema with typed columns plus `raw_data`.
- Added Postgres analytics repository behind `ANALYTICS_DATABASE_PROVIDER` / `DATABASE_PROVIDER`.
- Firebase remains default.
- Added analytics sync, smoke, and compare scripts.
- Preserved exact analytics read shape when `raw_data` exists.

## Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check providers\database\postgres.analytics.repository.js && node --check providers\database\analytics.repository.js && node --check scripts\sync.analytics.firebase-to-postgres.js && node --check scripts\smoke.analytics.js && node --check scripts\compare.analytics.firebase-postgres.js
findstr /R /N "[^ -~]" db\migrations\014_create_analytics.sql providers\database\postgres.analytics.repository.js scripts\sync.analytics.firebase-to-postgres.js scripts\smoke.analytics.js scripts\compare.analytics.firebase-postgres.js providers\database\analytics.repository.js package.json
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:migrate&&npm run db:sync:analytics&&set ANALYTICS_SMOKE_ID=evt_haanh_show_dalat_2026&&npm run db:smoke:analytics&&npm run db:compare:analytics
```

## Results

- `git diff --check`: passed.
- `node --check`: passed for changed JS files.
- ASCII scan: passed.
- Migration: skipped 001-014 after prior local application.
- Sync: found 8 Firebase Analytics documents and synced 8.
- Smoke:
  - provider: `postgres`
  - `getAnalyticsByEventId("evt_haanh_show_dalat_2026")`: found.
  - `getAnalyticsByEventIds(["evt_haanh_show_dalat_2026"])`: returned 1 record.
- Compare:
  - matched: 8
  - missing in postgres: 0
  - missing in firebase: 0
  - different: 0
  - exact key shape passed for `evt_haanh_show_dalat_2026`.

## Compatibility Notes

- Analytics read payload shape is preserved with `raw_data`.
- Firebase remains the default provider.
- Transaction wrappers are additive compatibility shims; full payment analytics atomicity should be reviewed before globally flipping payment write paths.

## Next Step

Run a consolidation review across all Phase C3 adapters, then define a provider flip matrix for local/dev before any Firebase package/config removal.
