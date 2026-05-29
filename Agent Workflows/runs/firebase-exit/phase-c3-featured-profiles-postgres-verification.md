# Phase C3 Featured Profiles Postgres Verification

Date: 2026-05-29

## Scope

- Server repo only: `Server-2025-Eventing`
- Branch: `staging`
- Commit: `704e0b6` - `Add Postgres featured profile adapter`
- Domain: featured profiles

## Changes Verified

- Added PostgreSQL `featured_profiles` schema with typed columns plus `raw_data`.
- Added Postgres featured profile repository behind `FEATURED_PROFILE_DATABASE_PROVIDER` / `DATABASE_PROVIDER`.
- Firebase remains default.
- Added featured profile sync, smoke, and compare scripts.
- Added Firebase `getAllFeaturedProfiles` helper for sync/compare.
- Updated Postgres user follow/unfollow to support featured profile follower counters.

## Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check providers\database\postgres.featuredProfile.repository.js && node --check providers\database\featuredProfile.repository.js && node --check providers\database\firebase.featuredProfile.repository.js && node --check providers\database\postgres.user.repository.js && node --check scripts\sync.featured_profiles.firebase-to-postgres.js && node --check scripts\smoke.featured_profiles.js && node --check scripts\compare.featured_profiles.firebase-postgres.js
findstr /R /N "[^ -~]" db\migrations\012_create_featured_profiles.sql providers\database\postgres.featuredProfile.repository.js scripts\sync.featured_profiles.firebase-to-postgres.js scripts\smoke.featured_profiles.js scripts\compare.featured_profiles.firebase-postgres.js providers\database\featuredProfile.repository.js providers\database\firebase.featuredProfile.repository.js providers\database\postgres.user.repository.js package.json
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:migrate&&npm run db:sync:featured_profiles&&set FEATURED_PROFILE_SMOKE_ID=fp_google_experts&&npm run db:smoke:featured_profiles&&npm run db:compare:featured_profiles
```

## Results

- `git diff --check`: passed.
- `node --check`: passed for changed JS files.
- ASCII scan: passed.
- Migration: skipped 001-012 after prior local application.
- Sync: synced 16 featured profiles.
- Smoke:
  - provider: `postgres`
  - `getFeaturedProfilesPage(1, 10)`: returned 10 profiles, totalItems 16.
  - `getFeaturedProfileById("fp_google_experts")`: found.
  - `getFeaturedProfilesByIds(["fp_google_experts"])`: found 1.
  - `getFeaturedProfileNamesByIds(["fp_google_experts"])`: returned `["Chuyên gia Google"]`.
- Compare:
  - matched: 16
  - missing in postgres: 0
  - missing in firebase: 0
  - different: 0
  - `getFeaturedProfileById`: match.
  - `getFeaturedProfilesPage`: match.
  - `getFeaturedProfilesByIds`: match.
  - `getFeaturedProfilesDataByIds`: match.

## Compatibility Notes

- Featured profile read payload shape is preserved with `raw_data`.
- Firebase remains the default provider.
- Postgres user follow/unfollow can now find `featured_profiles`, but full cross-table transaction parity should still be reviewed before broad write-path flip.

## Next Domain

Proceed to organizer profiles. Organizer dashboard/approval data still needs provider coverage before removing Firebase from organizer flows.
