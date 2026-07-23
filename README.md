# Eventing — Event Ticketing Platform

Full-stack **Eventing** monorepo (portfolio / internship).

| App | Folder | Stack |
|---|---|---|
| API | `server/` | Node.js, Express, PostgreSQL |
| Web | `web/` | Next.js, Tailwind |
| Attendee | `mobile-attendee/` | Kotlin |
| Organizer | `mobile-organizer/` | Kotlin |

## Source History

This public monorepo is the release-ready portfolio workspace combining server, web, and mobile projects with preserved git history. Source repositories:

| Area | Repository |
|---|---|
| Server | [Server-2025-Eventing](https://github.com/nguyenquangtruong08112005/Server-2025-Eventing) |
| Web | [Web-2025-Eventing](https://github.com/nguyenquangtruong08112005/Web-2025-Eventing) |
| Attendee Android | [Mobile-2025-Eventing](https://github.com/nguyenquangtruong08112005/Mobile-2025-Eventing) |
| Organizer Android | [Mobile-2025-Eventing-Organizer](https://github.com/nguyenquangtruong08112005/Mobile-2025-Eventing-Organizer) |


## Highlights (CV)

- Auth JWT, event lifecycle, tickets/QR check-in, order foundation  
- DB integrity + 3NF finish (migrations through 060)  
- Mobile user-facing errors (no raw HTTP dumps)  
- Web feature modules + safe-redirect (pending full remake)

## Quick start

```bash
cd server && npm.cmd install && npm.cmd run local:infra && npm.cmd run db:migrate && npm.cmd run dev
cd web && npm.cmd install && npm.cmd run dev -- -p 3001
```

Copy `.env.example`, `server/.env.example`, and `web/.env.example` to local `.env` files before enabling provider-backed features such as R2/S3, OneSignal, OAuth, email, or ZaloPay.

See **[DEMO.md](DEMO.md)** · **[START_HERE.md](START_HERE.md)** · **[NAMING.md](NAMING.md)**

## Docs

| Doc | Purpose |
|---|---|
| [agent-workflow/execution/CURRENT.md](agent-workflow/execution/CURRENT.md) | Program status |
| [agent-workflow/execution/db/](agent-workflow/execution/db/) | DB audit / finish |
| [PORTFOLIO_V1_SCOPE.md](agent-workflow/knowledge/project/PORTFOLIO_V1_SCOPE.md) | Scope |
