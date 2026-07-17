# Phase C3 Users Postgres Verification

Date: 2026-05-29

## Scope

- Server repo only: `Server-2025-Eventing`
- Branch: `staging`
- Commit: `8177014` - `Add Postgres user adapter`
- Domain: users

## Changes Verified

- Added PostgreSQL `user_profiles` schema.
- Added `raw_data` JSONB snapshot column to preserve Firebase document shape.
- Added Postgres user repository behind `USER_DATABASE_PROVIDER` / `DATABASE_PROVIDER`.
- Firebase remains default.
- Added users sync, smoke, and compare scripts.
- Preserved Firebase UID as `user_profiles.id`.

## Commands

```cmd
cd /d D:\01_university\year3\semester-5\mobile\final\Server-2025-Eventing
git diff --check
node --check providers\database\postgres.user.repository.js && node --check providers\database\user.repository.js && node --check scripts\sync.users.firebase-to-postgres.js && node --check scripts\smoke.users.js && node --check scripts\compare.users.firebase-postgres.js
findstr /R /N "[^ -~]" db\migrations\008_create_user_profiles.sql db\migrations\009_add_user_raw_data.sql providers\database\postgres.user.repository.js scripts\sync.users.firebase-to-postgres.js scripts\smoke.users.js scripts\compare.users.firebase-postgres.js providers\database\user.repository.js package.json
set DATABASE_URL=postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev&&npm run db:migrate&&npm run db:sync:users&&set USER_SMOKE_ID=Cs4RtarFibPqEC7i8QyTZ9MkcQm1&&npm run db:smoke:users&&set USER_COMPARE_IDS=&&npm run db:compare:users
```

## Results

- `git diff --check`: passed.
- `node --check`: passed for changed JS files.
- ASCII scan: passed.
- Migration: skipped 001-009 after prior local application.
- Sync: found 3 Firebase Auth users and synced 3 users.
- Smoke:
  - provider: `postgres`
  - `getUserDataById("Cs4RtarFibPqEC7i8QyTZ9MkcQm1")` returned Firebase-compatible keys: `id`, `roles`, `fcmTokens`.
  - `getUserRoles` returned `["organizer","attendde"]`.
  - `findUserByEmail` returned not found because this Firebase doc has no email field.
- Compare:
  - matched: 3
  - missing in postgres: 0
  - missing in firebase: 0
  - different: 0

## Compatibility Notes

- Read/raw user payload shape is preserved through `raw_data`.
- Firebase remains the default provider.
- The adapter keeps typed columns for email, roles, FCM tokens, organizer info, and profile counters so future domains can query without reading only JSON.
- Do not globally flip user write-paths yet. Some methods update typed columns and `raw_data`, but follow/update transactional parity still needs focused hardening before using Postgres for high-concurrency profile writes.
- `getEventsByIds` still returns `[]` because events are not migrated yet.

## Next Domain

Proceed to events before tickets. Events unblock ticket/payment inventory checks, media organizer authorization, organizer dashboards, and future ticket repository joins.
