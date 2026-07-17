# Phase C3 Reviews Postgres Verification

Date: 2026-05-29

## Scope

- Server repo only: `Server-2025-Eventing`
- Branch: `staging`
- Commit: `a027202` - `Add Postgres review adapter`
- Domain: reviews

## Changes Verified

- Added PostgreSQL reviews schema.
- Added review user snapshot columns so the Postgres read payload can match Firebase `user.name` and `user.profilePicUrl` before the users domain is fully migrated.
- Added Postgres review repository behind the existing review repository selector.
- Firebase remains default unless `REVIEW_DATABASE_PROVIDER=postgres` or `DATABASE_PROVIDER=postgres` is set.
- Added sync, smoke, and compare scripts for reviews.

## Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check providers\database\postgres.review.repository.js && node --check providers\database\review.repository.js && node --check scripts\sync.reviews.firebase-to-postgres.js && node --check scripts\smoke.reviews.js && node --check scripts\compare.reviews.firebase-postgres.js
findstr /R /N "[^ -~]" db\migrations\006_create_reviews.sql db\migrations\007_add_review_user_snapshot.sql providers\database\postgres.review.repository.js scripts\sync.reviews.firebase-to-postgres.js scripts\smoke.reviews.js scripts\compare.reviews.firebase-postgres.js providers\database\review.repository.js package.json
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:migrate
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:sync:reviews
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:smoke:reviews
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:compare:reviews
```

## Results

- `git diff --check`: passed.
- `node --check`: passed for changed JS files.
- ASCII scan: passed.
- Migration: skipped 001-006, applied `007_add_review_user_snapshot.sql`.
- Sync: synced 2 reviews for `evt_vdf_hcm_2025`.
- Smoke:
  - provider: `postgres`
  - `getReviewsByEventId("evt_vdf_hcm_2025", 1, 5)` returned 2 reviews.
  - pagination matched expected shape.
  - first review retained Firebase-compatible `user.name` and `user.profilePicUrl`.
  - `checkUserTicketForEvent(smoke_user, evt_vdf_hcm_2025)` returned `false` because tickets are not migrated yet.
- Compare:
  - matched: 2
  - missing in postgres: 0
  - missing in firebase: 0
  - different: 0

## Compatibility Notes

- Review route payload shape is unchanged for read path.
- User enrichment is preserved with snapshot columns during Firebase-to-Postgres sync.
- Firebase remains available and default.
- Full write-path flip should wait for tickets/events/users PostgreSQL coverage because ticket ownership checks currently return `false` when the tickets table is absent.

## Next Domain

Proceed to users before ticket/event write-path flips because reviews, media, auth, and future organizer/admin flows need stable user identity/profile data.
