# AuraEvents — Event Ticketing Platform

Full-stack **event discovery & ticketing** monorepo (portfolio / internship).

| App | Folder | Stack |
|---|---|---|
| API | `server/` | Node.js, Express, PostgreSQL |
| Web | `web/` | Next.js, Tailwind |
| Attendee | `mobile-attendee/` | Kotlin |
| Organizer | `mobile-organizer/` | Kotlin |

## Highlights (CV)

- Auth JWT, event lifecycle, tickets/QR check-in, order foundation  
- DB integrity + 3NF finish (migrations through 060)  
- Mobile user-facing errors (no raw HTTP dumps)  
- Web feature modules + safe-redirect (pending full remake)

## Quick start

```bash
cd server && npm install && npm run local:infra && npm run db:migrate && npm run dev
cd web && npm install && npm run dev
```

See **[DEMO.md](DEMO.md)** · **[START_HERE.md](START_HERE.md)** · **[NAMING.md](NAMING.md)**

## Docs

| Doc | Purpose |
|---|---|
| [agent-workflow/execution/CURRENT.md](agent-workflow/execution/CURRENT.md) | Program status |
| [agent-workflow/execution/db/](agent-workflow/execution/db/) | DB audit / finish |
| [PORTFOLIO_V1_SCOPE.md](agent-workflow/knowledge/project/PORTFOLIO_V1_SCOPE.md) | Scope |
