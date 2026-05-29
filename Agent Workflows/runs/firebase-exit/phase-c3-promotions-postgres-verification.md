# Phase C3 Promotions PostgreSQL Verification

Date: 2026-05-29
Scope: local/dev Postgres provider coverage for `promotions`

## Server Commit

- `0b02a5e` - Add Postgres promotion adapter

## Files Added

- `db/migrations/005_create_promotions.sql`
- `providers/database/postgres.promotion.repository.js`
- `scripts/sync.promotions.firebase-to-postgres.js`
- `scripts/smoke.promotions.js`
- `scripts/compare.promotions.firebase-postgres.js`

## Behavior

- Firebase remains default.
- `PROMOTION_DATABASE_PROVIDER=postgres` can flip only promotion repository to PostgreSQL.
- Promotion route payloads are unchanged.
- Arbitrary promotion fields are preserved through JSONB `data`.

## Verification Results

Migration:

```cmd
npm run db:migrate
```

Result:

- `OK    005_create_promotions.sql`

Firebase data:

- Active public promotions: 0, because the existing Firebase promotions are expired relative to 2026-05-29.
- Organizer verified: `w6ZEeGefVWUBmx418EqTmyQcN503`
- Organizer promotions found in Firebase: 3

Sync:

```cmd
set PROMOTION_SYNC_ORGANIZER_ID=w6ZEeGefVWUBmx418EqTmyQcN503
npm run db:sync:promotions
```

Result:

- Synced 0 active public promotions.
- Synced 3 organizer promotions.

Smoke:

```cmd
set PROMOTION_SMOKE_ORGANIZER_ID=w6ZEeGefVWUBmx418EqTmyQcN503
npm run db:smoke:promotions
```

Result:

- `getActivePromotions` returned 0 promotions.
- `getPromotionsByOrganizer` returned 3 promotions.

Compare:

```cmd
set PROMOTION_SMOKE_ORGANIZER_ID=w6ZEeGefVWUBmx418EqTmyQcN503
npm run db:compare:promotions
```

Result:

- matched: 3
- missing in postgres: 0
- missing in firebase: 0
- different: 0

## Limitations

- `getEventById` returns `null` until the PostgreSQL `events` table exists.
- Firestore transaction-specific methods are implemented non-transactionally in PostgreSQL and are not safe for payment/ticket flows until ticket/event payment logic is migrated to PostgreSQL transactions.

## Decision

Promotions has payload parity for organizer reads.

Do not use `PROMOTION_DATABASE_PROVIDER=postgres` in ticket purchase/payment flows yet.
