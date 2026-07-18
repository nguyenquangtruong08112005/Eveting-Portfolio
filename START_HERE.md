# AuraEvents — Start Here

Portfolio monorepo for **AuraEvents** (event discovery & ticketing).

## Apps (canonical names)

| Folder | Role |
|---|---|
| `server/` | Backend API (Node modular monolith + Postgres) |
| `web/` | Next.js web portal |
| `mobile-attendee/` | Android consumer app |
| `mobile-organizer/` | Android organizer app |
| `agent-workflow/` | Knowledge + execution docs |

> **Legacy folder names are archived.** Use only `server/`, `web/`, `mobile-attendee/`, `mobile-organizer/`.  
> Map + restore tags: [`archive/legacy-folder-names-2026-07/README.md`](archive/legacy-folder-names-2026-07/README.md)

See **[NAMING.md](NAMING.md)** for conventions.

## Read first

1. **[README.md](README.md)** — CV overview  
2. **[DEMO.md](DEMO.md)** — 3-minute demo script  
3. **[PORTFOLIO_V1_SCOPE.md](agent-workflow/knowledge/project/PORTFOLIO_V1_SCOPE.md)** — what ships now  
4. **[agent-workflow/execution/CURRENT.md](agent-workflow/execution/CURRENT.md)** — program status  
5. **[agent-workflow/execution/db/](agent-workflow/execution/db/)** — DB hub  
6. **[web/DESIGN.md](web/DESIGN.md)** — web design system (pre-remake)  

## Local run

```bash
# Infra + API
cd server
npm install
npm run local:infra
npm run db:migrate
npm run dev

# Web (second terminal)
cd web
npm install
npm run dev
```

## Next product work

1. Hardening leftovers (in progress)  
2. You report mobile bugs → we fix  
3. **Remake web** (planned)  
4. **Redesign mobile UI** (planned)  
