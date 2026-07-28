# Eventing -- local test accounts

> **Local / demo only.** Do not use these passwords in production.
> Seed source: `server` > `npm run db:seed:demo-users`
> Last updated: 2026-07-28

## Password (all accounts below)

```text
123456
```

## Guaranteed primary accounts

| Role | Email | Password | After login (web) |
|------|-------|----------|-------------------|
| **Admin** | `admin@eventing.com` | `123456` | `/admin/moderation` |
| **Organizer** | `organizer@eventing.com` | `123456` | `/organizer/dashboard` |
| **Attendee** | `alice@email.com` | `123456` | `/` (home) |

> `hanoi.events@eventing.com` is **not** a seeded account -- use `organizer@eventing.com`.

## Local URLs

| Service | URL |
|---------|-----|
| Web | http://localhost:3001 |
| API | http://localhost:3000 |
| API health | http://localhost:3000/health |
| Login (web) | http://localhost:3001/login |

## Re-seed accounts

```bat
cd /d D:\01_university\year3\semester-5\mobile\final\server
npm.cmd run db:seed:demo-users
```

## Verify accounts (read-only)

```bat
docker exec mobile-eventing-postgres psql -U eventing -d eventing_dev -c "SELECT email, is_active, email_verified, roles FROM auth_users WHERE email IN ('alice@email.com','organizer@eventing.com','admin@eventing.com') ORDER BY email;"
```

Expected output (password hash omitted):
```text
         email          | is_active | email_verified |    roles
------------------------+-----------+----------------+-------------
 admin@eventing.com     | t         | t              | {admin}
 alice@email.com        | t         | t              | {user}
 organizer@eventing.com | t         | t              | {organizer}
(3 rows)
```

## Quick API login check

```bat
curl -X POST http://localhost:3000/api/web/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@eventing.com\",\"password\":\"123456\"}"
```

If you get **429 Too many requests**, wait ~1 minute and retry (login rate limit).
