# Postgres seed data

| Path | Purpose |
|------|---------|
| **`npm run db:seed:platform`** | **Recommended** — realistic Vietnam marketplace data (venues, published events, organizers, promotions, login accounts). |
| `scripts/seed/seed.demo-users.postgres.js` | Auth-only demo accounts |
| `scripts/seed/seed.venues.postgres.js` | Legacy venue JSON only |
| `scripts/seed/seed.events.postgres.js` | Legacy `events_seed.json` (old Firebase-shaped fixtures) |
| `*.json` in this folder | Historical fixtures — prefer `db:seed:platform` |

## Platform seed

```bat
cd server
npm run db:migrate
npm run db:seed:platform
```

Password for all seeded accounts: **`123456`**

| Role | Email |
|------|--------|
| Admin | `admin@eventing.com` |
| Organizer (SG) | `organizer@eventing.com` |
| Organizer (HN) | `hanoi.events@eventing.com` |
| Attendee | `nguyen.an@email.com`, `tran.linh@email.com`, `alice@email.com` |

Events use **relative dates** (from “now”) so the home feed stays current. One event is **submitted** for the admin moderation queue.
