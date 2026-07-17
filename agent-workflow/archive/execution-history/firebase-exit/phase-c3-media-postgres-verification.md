# Phase C3 Media PostgreSQL Verification

Date: 2026-05-29
Scope: local/dev Postgres provider coverage for `media`

## Server Commit

- `998583b` - Add Postgres media adapter

## Files Added

- `db/migrations/004_create_event_media.sql`
- `providers/database/postgres.media.repository.js`
- `scripts/smoke.media.js`

## Behavior

- Firebase remains default.
- `MEDIA_DATABASE_PROVIDER=postgres` can flip only media repository to PostgreSQL.
- Media route payloads are unchanged.
- `getEventMediaPage` returns the same top-level shape:
  - `media`
  - `pagination.currentPage`
  - `pagination.limit`
  - `pagination.totalPages`
  - `pagination.totalItems`

## Verification Results

Migration:

```cmd
npm run db:migrate
```

Result:

- `SKIP  001_create_venues.sql`
- `SKIP  002_create_auth_tables.sql`
- `SKIP  003_create_notifications.sql`
- `OK    004_create_event_media.sql`

Smoke:

```cmd
npm run db:smoke:media
```

Result:

- `getEventMediaPage("evt_vdf_hcm_2025", 1, 10)` returned 0 media items.
- Pagination payload shape was valid.

## Limitations

- Media is not yet safe for a full behavior flip.
- `hasEligibleTicket` depends on a future PostgreSQL `tickets` table and returns `false` when the table is absent.
- `getEventOrganizerId` depends on a future PostgreSQL `events` table and returns `null` when the table is absent.
- User enrichment uses `auth_users` if present; full user profile parity still depends on the future users domain migration.
- There was no media fixture or existing Firebase media data verified in this pass.

## Decision

Media schema/adapter coverage exists, but media should not be enabled in local/dev flows that need upload authorization until tickets/events/users PostgreSQL coverage is added.
