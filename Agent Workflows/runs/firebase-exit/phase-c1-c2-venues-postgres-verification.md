# Phase C1/C2 Venues PostgreSQL Verification

Date: 2026-05-29
Scope: local/dev Postgres provider flip for `venues`

## Local Postgres

Docker Desktop was started and a local Postgres container was created:

```cmd
docker run --name mobile-eventing-postgres ^
  -e POSTGRES_DB=eventing_dev ^
  -e POSTGRES_USER=eventing ^
  -e POSTGRES_PASSWORD=eventing_dev_password ^
  -p 55432:5432 ^
  -d postgres:16-alpine
```

Connection used for verification:

```cmd
DATABASE_URL=postgres://eventing:<dev-password>@localhost:55432/eventing_dev
```

## Scripts Added

Server commit: `1e3003e` - Add venue Postgres flip harness

- `db:migrate`
- `db:smoke:venues`
- `db/migrate.js`
- `scripts/smoke.venues.js`
- `VENUE_DATABASE_PROVIDER` override for `venue.repository.js`

Server commit: `5e8e2af` - Add venue seed and compare scripts

- `db:seed:venues`
- `db:sync:venues`
- `db:compare:venues`
- `scripts/seed.venues.postgres.js`
- `scripts/sync.venues.firebase-to-postgres.js`
- `scripts/compare.venues.firebase-postgres.js`

## Verification Results

Migration:

```cmd
npm run db:migrate
```

Result:

- `OK    001_create_venues.sql`
- `OK    002_create_auth_tables.sql`

Initial smoke after seed file:

```cmd
npm run db:seed:venues
npm run db:smoke:venues
```

Result:

- Seeded 7 venues from `seed/venues.json`.
- Postgres `getAllVenues` returned 7 venues.

Firebase/Postgres comparison before sync:

```cmd
npm run db:compare:venues
```

Result:

- matched: 7
- missing in postgres: 2
- missing in firebase: 0
- different: 0

Sync from Firebase to Postgres:

```cmd
npm run db:sync:venues
```

Result:

- Synced 9 venues from Firebase to Postgres.

Final Firebase/Postgres comparison:

```cmd
npm run db:compare:venues
```

Result:

- matched: 9
- missing in postgres: 0
- missing in firebase: 0
- different: 0

## Decision

`venues` is the first safe provider-flip candidate.

Recommended local/dev env for testing:

```cmd
set DATABASE_URL=postgres://eventing:<dev-password>@localhost:55432/eventing_dev
set VENUE_DATABASE_PROVIDER=postgres
```

Do not set global `DATABASE_PROVIDER=postgres` yet because other repository domains do not have PostgreSQL adapters.

## Remaining Risks

- Only `venues` has payload parity.
- Other domains still need PostgreSQL schemas/adapters before global database flip.
- Backend auth route wiring remains deferred.
- OneSignal remains a provider option only; Firebase FCM is still default until mobile identifier migration is ready.
