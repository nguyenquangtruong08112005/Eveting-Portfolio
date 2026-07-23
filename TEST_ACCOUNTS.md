# Eventing — local test accounts

> **Local / demo only.** Do not use these passwords in production.  
> Seed source: `server` → `npm run db:seed:platform` and/or `npm run db:seed:demo-users`  
> Last updated: 2026-07-21

## Password (all accounts below)

```text
123456
```

## Primary accounts (use these first)

| Role | Email | Password | After login (web) |
|------|--------|----------|-------------------|
| **Admin** | `admin@eventing.com` | `123456` | `/admin/moderation` |
| **Organizer (Hanoi)** | `hanoi.events@eventing.com` | `123456` | `/organizer/dashboard` |
| **Organizer** | `organizer@eventing.com` | `123456` | `/organizer/dashboard` |
| **Attendee** | `alice@email.com` | `123456` | `/` (home) |

## Extra attendees (platform seed)

| Role | Email | Password |
|------|--------|----------|
| Attendee | `nguyen.an@email.com` | `123456` |
| Attendee | `tran.linh@email.com` | `123456` |
| Attendee | `le.hung@email.com` | `123456` |

## Optional local smoke accounts (if seeded)

| Role | Email | Password |
|------|--------|----------|
| Organizer | `test.organizer@eventing.local` | `123456` (if seeded with demo password) |
| Attendee | `test.attendee@eventing.local` | `123456` (if seeded with demo password) |

> Smoke/synthetic emails (`*@smoke.test`, `synthetic_*`) are created by automated tests — ignore for manual QA.

## Local URLs

| Service | URL |
|---------|-----|
| Web | http://localhost:3001 |
| API | http://localhost:3000 |
| API health | http://localhost:3000/health |
| Login (web) | http://localhost:3001/login |

## Re-seed accounts

```bat
cd server
npm.cmd run db:migrate
npm.cmd run db:seed:platform
REM or auth-only:
npm.cmd run db:seed:demo-users
```

## Quick API login check

```bat
curl -X POST http://localhost:3000/api/web/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@eventing.com\",\"password\":\"123456\"}"
```

If you get **429 Too many requests**, wait ~1 minute and retry (login rate limit).
