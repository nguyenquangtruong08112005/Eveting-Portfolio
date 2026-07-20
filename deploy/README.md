# Deploy & local ops

## 1. Master local command (Windows)

From monorepo root (`final/`):

```bat
REM Preferred (cmd — no PowerShell execution policy issues)
scripts\dev-up.cmd
scripts\dev-up-pure.cmd
scripts\dev-down.cmd

REM or via npm.cmd
npm.cmd run dev:up
```

**If you see** `npm.ps1 cannot be loaded because running scripts is disabled`:

1. Do **not** type bare `npm` in PowerShell (it runs `npm.ps1`).
2. Use **`npm.cmd`** or double-click / run from **cmd**:
   - `scripts\dev-up.cmd`
   - `npm.cmd run dev:up`
3. Optional permanent fix (your user only):
   `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

| Service | Default URL |
|---|---|
| API | http://localhost:3000 |
| Web | http://localhost:3001 (shifted if API is 3000) |
| Postgres | localhost:55432 / `eventing` / `eventing_dev_password` / `eventing_dev` |
| Redis | `redis://localhost:6379` (`REDIS_URL`) |
| ES | http://localhost:9200 |
| ngrok | public HTTPS → API (for mobile) |
| **Grafana** (obs) | http://localhost:3301 — `npm.cmd run obs:up` |
| Prometheus | http://localhost:9090 |
| Loki | http://localhost:3100 |

Admin web embeds Grafana at `/admin/observability`. Details: `server/infra/observability/README.md`.

Point mobile `BASE_URL` at the **ngrok https** URL while developing.

### Prerequisites

- Docker Desktop running  
- Node 20+ / npm  
- PowerShell 5.1+ or pwsh  
- Optional: [ngrok](https://ngrok.com/download) on PATH  

---

## 2. Dockerized apps (local parity with deploy)

```bat
docker compose up -d
docker compose -f docker-compose.yml -f docker-compose.app.yml --profile tools run --rm migrate
npm.cmd run docker:up
REM API :3000  Web :3001
```

Images:

- `server/Dockerfile` — Node 22 alpine API  
- `web/Dockerfile` — Next.js standalone  

---

## 3. AWS + Terraform + Ansible + CI/CD (prep)

### Layout

| Path | Role |
|---|---|
| `server/infra/terraform/` | VPC, SG, EC2-style baseline (existing) |
| `server/infra/ansible/` | Host bootstrap / observability (existing) |
| `.github/workflows/ci.yml` | Build server + web + docker images |
| `.github/workflows/deploy-aws.yml` | Manual: push ECR, optional TF/Ansible |

### Suggested AWS target shape (portfolio)

```text
Internet → ALB
            ├─ target group : web (ECS Fargate or EC2)
            └─ target group : api (ECS Fargate or EC2)
RDS Postgres  ·  S3 media  ·  ECR images  ·  CloudWatch logs
```

Terraform today scaffolds VPC/SG; extend with ECR + ECS/EC2 as next slice.

### GitHub secrets for deploy

| Secret | Purpose |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Deploy credentials (or use OIDC later) |
| `AWS_REGION` | e.g. `ap-southeast-1` |
| `NEXT_PUBLIC_API_URL` | Public API base for web image |
| `ANSIBLE_INVENTORY` | inventory.ini content |
| ECR repositories | Create `eventing-api`, `eventing-web` first |

### Manual deploy workflow

Actions → **Deploy AWS (manual)** → choose `staging` / `production` → optionally enable Terraform/Ansible.

---

## 4. Environment checklist before AWS

- [ ] Production secrets (JWT, DB, S3, Zalo) via AWS SSM/Secrets Manager  
- [ ] RDS not public; security groups least privilege  
- [ ] HTTPS (ACM + ALB)  
- [ ] Migrate as Job / one-shot container, not on every API restart  
- [ ] Health: `GET /health` on API  
- [ ] Observability compose optional for staging  

---

## 5. Quick command cheat sheet

```text
npm.cmd run infra:up
npm.cmd run db:migrate
scripts\dev-up.cmd
npm.cmd run docker:build
npm.cmd run docker:up
npm.cmd run docker:down
```
