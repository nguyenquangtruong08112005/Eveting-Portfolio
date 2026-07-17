# Phase C3 Notifications PostgreSQL Verification

Date: 2026-05-29
Scope: local/dev Postgres provider coverage for `notifications`

## Server Commit

- `ea12b69` - Add Postgres notification adapter

## Files Added

- `db/migrations/003_create_notifications.sql`
- `providers/database/postgres.notification.repository.js`
- `scripts/seed.notifications.postgres.js`
- `scripts/smoke.notifications.js`
- `scripts/compare.notifications.firebase-postgres.js`
- `scripts/sync.notifications.firebase-to-postgres.js`

## Behavior

- Firebase remains default.
- `NOTIFICATION_DATABASE_PROVIDER=postgres` can flip only notification repository to PostgreSQL.
- Route payloads and notification payload fields are unchanged.
- `createdAt` remains numeric in returned payloads.

## Verification Results

Migration:

```cmd
npm run db:migrate
```

Result:

- `SKIP  001_create_venues.sql`
- `SKIP  002_create_auth_tables.sql`
- `OK    003_create_notifications.sql`

Seed and initial smoke:

```cmd
npm run db:seed:notifications
npm run db:smoke:notifications
```

Result:

- Seeded 3 notifications from fixture.
- For default user `user_alice`, Postgres returned 1 notification from fixture.

Initial Firebase/Postgres comparison:

```cmd
npm run db:compare:notifications
```

Result:

- matched: 1
- missing in postgres: 0
- missing in firebase: 0
- different: 1

Cause:

- Fixture data had stale `isRead=false`; Firebase had `isRead=true`.

Sync from Firebase to Postgres:

```cmd
npm run db:sync:notifications
```

Result:

- Synced 2 notifications for `user_alice`.

Final smoke:

```cmd
npm run db:smoke:notifications
```

Result:

- Postgres returned 2 notifications for `user_alice`.

Final comparison:

```cmd
npm run db:compare:notifications
```

Result:

- matched: 2
- missing in postgres: 0
- missing in firebase: 0
- different: 0

## Decision

`notifications` has local/dev payload parity for the verified user path.

Do not set global `DATABASE_PROVIDER=postgres`; use `NOTIFICATION_DATABASE_PROVIDER=postgres` for notification-only local/dev checks.

## Remaining Work

- Expand the same pattern to `media`, then `promotions`, `reviews`, `users`, `tickets`, and `events`.
- Broaden notification comparison for more users if needed.
