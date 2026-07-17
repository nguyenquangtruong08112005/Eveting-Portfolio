# Eventing Platform — Start Here

Portfolio monorepo for **AuraEvents** (event discovery & ticketing).

## Apps

| Folder | Role |
|---|---|
| `Server-2025-Eventing` | Backend API (Node modular monolith + Postgres) |
| `web-2025-eventing` | Next.js web portal |
| `Mobile-2025-Eventing` | Android consumer app |
| `Mobile-2025-Eventing-Organizer` | Android organizer app |

## Read first

1. **[README.md](README.md)** — CV overview  
2. **[DEMO.md](DEMO.md)** — 3-minute demo script  
3. **[PORTFOLIO_V1_SCOPE.md](agent-workflow/knowledge/project/PORTFOLIO_V1_SCOPE.md)** — what ships now  
4. **[agent-workflow/execution/CURRENT.md](agent-workflow/execution/CURRENT.md)** — **active work pointer**  
5. **[agent-workflow/execution/db/](agent-workflow/execution/db/)** — DB integrity / 3NF / finish hub  
6. **[agent-workflow/knowledge/INDEX.md](agent-workflow/knowledge/INDEX.md)** — knowledge index  
7. **[web-2025-eventing/DESIGN.md](web-2025-eventing/DESIGN.md)** — web design system  

## Local run (shortest path)

```bash
# Infra + API
cd Server-2025-Eventing
npm install
npm run local:infra
npm run db:migrate
npm run dev

# Web (second terminal)
cd web-2025-eventing
npm install
npm run dev
```

Docker from monorepo root (optional): `docker compose up -d` then migrate/start server as above.

## Agent policy

- **Single agent only.** Multi-agent tooling archived: `agent-workflow/archive/orchestration/`  
- Portfolio V1 scope beats full enterprise design for implementation.  
- One module / one concern per change; Postgres + FKs only.

## Status (remediation)

Phases **A–F** tracked in  
[agent-workflow/execution/active/agent-debt-remediation.md](agent-workflow/execution/active/agent-debt-remediation.md)

| Phase | Topic | Status |
|---|---|---|
| A | Docs freeze | Done |
| B | DB P0 (migrate + FKs) | Done |
| C | Server criticals / smokes | Done |
| D | Web features + security | Done |
| E | Mobile errors + READMEs | Done |
| F | Demo / README / compose | Done |

## Legacy

| Path | Status |
|---|---|
| `Agent Workflows/` | Removed (was duplicate of `agent-workflow/`) |
| Enterprise design `knowledge/project/00–11` | Frozen future vision |
