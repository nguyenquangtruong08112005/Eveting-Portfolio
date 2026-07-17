# AuraEvents — Event Ticketing Platform

Full-stack **event discovery & ticketing** monorepo (portfolio / internship).

| App | Stack | Role |
|---|---|---|
| `Server-2025-Eventing` | Node.js, Express, PostgreSQL | REST API, auth, events, tickets, payments |
| `web-2025-eventing` | Next.js, Tailwind, design system | Public + organizer + admin web |
| `Mobile-2025-Eventing` | Kotlin, Clean Architecture | Attendee Android app |
| `Mobile-2025-Eventing-Organizer` | Kotlin, Clean Architecture | Organizer / check-in Android app |

## Highlights (CV)

- **Auth:** JWT register/login, role-aware routes  
- **Event lifecycle:** draft → submit → admin approve → publish  
- **Commerce path:** ticket types, capacity, order foundation, payment create-order  
- **Tickets:** QR payload, my-tickets, check-in validation  
- **Web architecture:** feature modules (`src/features/*`), design tokens ([DESIGN.md](web-2025-eventing/DESIGN.md)), open-redirect guard on payment URLs  
- **Mobile UX:** user-facing error mapper (no raw `code: 401` / errorBody dumps)  
- **Data integrity:** transactional migrations, critical FKs (orders/tickets/reviews/profiles)  
- **Quality:** smoke tests (auth, lifecycle, order foundation), unit tests (QR, safe-redirect, UserFacingErrors)

## Quick start

See **[DEMO.md](DEMO.md)** for the 3-minute walkthrough.

```bash
# API
cd Server-2025-Eventing && npm install && npm run local:infra && npm run db:migrate && npm run dev

# Web
cd web-2025-eventing && npm install && npm run dev
```

## Documentation

| Doc | Purpose |
|---|---|
| [START_HERE.md](START_HERE.md) | Monorepo orientation |
| [DEMO.md](DEMO.md) | Demo script |
| [agent-workflow/execution/CURRENT.md](agent-workflow/execution/CURRENT.md) | **Active program pointer** |
| [agent-workflow/execution/db/](agent-workflow/execution/db/) | DB audit / 3NF / finish hub |
| [agent-workflow/knowledge/INDEX.md](agent-workflow/knowledge/INDEX.md) | Knowledge index |
| [PORTFOLIO_V1_SCOPE.md](agent-workflow/knowledge/project/PORTFOLIO_V1_SCOPE.md) | **What ships now** |
| Enterprise design `knowledge/project/00–11` | Frozen future marketplace design |

## Architecture (short)

```text
Clients (Web / Mobile) → Server modular monolith
  modules: auth, events, tickets, orders, payments, reviews, …
  providers: Postgres repositories (facades → postgres.*)
  db/migrations: numbered SQL, transactional runner
```

Enterprise multi-context design is documented for later; **implementation priority is Portfolio V1**.

## License / academic

University final project / portfolio use.
