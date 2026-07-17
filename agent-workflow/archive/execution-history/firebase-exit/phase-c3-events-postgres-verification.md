# Phase C3 Events Postgres Verification

Date: 2026-05-29

## Scope

- Server repo only: `Server-2025-Eventing`
- Branch: `staging`
- Commit: `7bc1b0b` - `Add Postgres event adapter`
- Domain: events

## Changes Verified

- Added PostgreSQL `events` schema with typed columns plus `raw_data`.
- Added Postgres event repository behind `EVENT_DATABASE_PROVIDER` / `DATABASE_PROVIDER`.
- Firebase remains default.
- Added events sync, smoke, and compare scripts.
- Updated Postgres promotion adapter to query the new `events` table for event lookups.
- Fixed Postgres `getPublicEventsPage` to match Firebase selected-field projection.

## Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check providers\database\postgres.event.repository.js && node --check providers\database\event.repository.js && node --check providers\database\postgres.promotion.repository.js && node --check scripts\sync.events.firebase-to-postgres.js && node --check scripts\smoke.events.js && node --check scripts\compare.events.firebase-postgres.js
findstr /R /N "[^ -~]" db\migrations\010_create_events.sql providers\database\postgres.event.repository.js scripts\sync.events.firebase-to-postgres.js scripts\smoke.events.js scripts\compare.events.firebase-postgres.js providers\database\event.repository.js providers\database\postgres.promotion.repository.js package.json
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:migrate&&npm run db:sync:events&&set EVENT_SMOKE_ID=evt_vdf_hcm_2025&&npm run db:smoke:events&&npm run db:compare:events
```

## Results

- `git diff --check`: passed.
- `node --check`: passed for changed JS files.
- ASCII scan: passed.
- Migration: skipped 001-010 after prior local application.
- Sync: found 23 Firebase Firestore events and synced 23 events.
- Smoke:
  - provider: `postgres`
  - `getEventById("evt_vdf_hcm_2025")`: found.
  - `getEventDataById("evt_vdf_hcm_2025")`: found.
  - `getEventRawById`: exists true.
  - `getActiveEventsInDateRange`: returned 19 active events.
  - `getEventsByOrganizerId("w6ZEeGefVWUBmx418EqTmyQcN503")`: returned 5 events.
  - `getEventEntriesByOrganizer("w6ZEeGefVWUBmx418EqTmyQcN503")`: returned 23 entries.
  - `getPublicEventsPage(1, 5)`: totalItems 18, returned 5 entries.
- Compare:
  - matched: 23
  - missing in postgres: 0
  - missing in firebase: 0
  - different: 0
  - `getEventById`: match for `evt_vdf_hcm_2025`
  - `getPublicEventsPage(1, 10)`: totalItems matched 18 and entries matched Firebase projection.

## Compatibility Notes

- Event raw/read payload shape is preserved with `raw_data`.
- Public event listing projection is kept compatible with Firebase `.select(...)`.
- Firebase remains the default provider.
- Event write methods are additive and not globally flipped yet.
- Promotion Postgres event lookup now depends on the events migration being applied.

## Next Domain

Proceed to tickets. Tickets unblock review write checks, media eligibility checks, payment state migration, and event ticket availability updates.
