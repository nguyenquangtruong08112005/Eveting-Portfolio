# Deploy & local ops

## 1. Master local command (Windows)

From monorepo root (`final/`):

```powershell
# One shot: Postgres+ES, migrate, API window, Web window, ngrok tunnel to API
npm run dev:up

# Same without ngrok
npm run dev:up:no-ngrok

# Stop docker infra
npm run dev:down
```

Or call scripts directly:

```powershell
pwsh -File scripts/dev-up.ps1
pwsh -File scripts/dev-up.ps1 -NoNgrok -ApiPort 3000
```

| Service | Default URL |
|---|---|
| API | http://localhost:3000 |
| Web | http://localhost:3001 (shifted if API is 3000) |
| Postgres | localhost:55432 / `eventing` / `eventing_dev_password` / `eventing_dev` |
| ES | http://localhost:9200 |
| ngrok | public HTTPS → API (for mobile) |

Point mobile `BASE_URL` at the **ngrok https** URL while developing.

### Prerequisites

- Docker Desktop running  
- Node 20+ / npm  
- PowerShell 5.1+ or pwsh  
- Optional: [ngrok](https://ngrok.com/download) on PATH  

---

## 2. Dockerized apps (local parity with deploy)

```powershell
# Infra only (postgres + es)
docker compose up -d

# Migrate
docker compose -f docker-compose.yml -f docker-compose.app.yml --profile tools run --rm migrate

# Build & run API + web
npm run docker:up
# API :3000  Web :3001
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
| ECR repositories | Create `auraevents-api`, `auraevents-web` first |

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
npm run infra:up          # postgres + es
npm run db:migrate
npm run dev:up            # full local + ngrok
npm run docker:build
npm run docker:up
npm run docker:down
```
