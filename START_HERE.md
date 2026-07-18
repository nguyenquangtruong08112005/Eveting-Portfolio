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

## Local run (master command)

```powershell
# From monorepo root — infra + migrate + API + web + ngrok
npm run dev:up

# Without ngrok
npm run dev:up:no-ngrok

# Stop docker infra
npm run dev:down
```

Details: **[deploy/README.md](deploy/README.md)**

Manual (two terminals):

```bash
cd server && npm install && npm run local:infra && npm run db:migrate && npm run dev
cd web && npm install && npm run dev -- -p 3001
```

## Docker / AWS prep

```powershell
npm run docker:up          # compose: postgres + api + web
# Terraform / Ansible / CI-CD: see deploy/README.md
```

## Next product work

1. You report mobile bugs → we fix  
2. **Remake web**  
3. **Redesign mobile UI**  
4. Extend Terraform (ECR/ECS) for real AWS deploy  

