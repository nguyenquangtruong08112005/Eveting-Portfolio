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
| `server/infra/terraform/` | AWS IaC: VPC, subnet, SG, EC2, Elastic IP, ECR, optional Cloudflare DNS |
| `server/infra/ansible/` | Host bootstrap, Docker app rollout, runtime env, observability |
| `.github/workflows/ci.yml` | Build server + web + docker images |
| `.github/workflows/deploy-aws.yml` | Manual: optional Terraform, push ECR images, optional Ansible deploy |

### AWS target shape (portfolio demo)

```text
GitHub Actions
  optional terraform apply
  create/update AWS infra (IAM + SSM role)
  build eventing-api/eventing-web
  push images to ECR with tags: <github.sha> and <environment>
  run Ansible via AWS SSM Session Manager (no SSH key)

EC2
  docker compose pull <github.sha>
  docker compose --profile tools run --rm migrate
  docker compose up -d

Cloudflare
  DNS/proxy/TLS in front of EC2
```

This is intentionally one-instance Docker Compose for portfolio demo. RDS/ECS/ALB can be added later, but they are not required for the first public deploy.

### GitHub secrets for deploy

| Secret | Purpose |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Deploy credentials (or OIDC role) |
| `AWS_REGION` | e.g. `ap-southeast-2` |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ZONE_ID` | Optional Terraform-managed DNS |
| `NEXT_PUBLIC_API_URL` | Public API base for web image and deployed web |
| `APP_PUBLIC_URL` | Public API callback base for payment/webhooks |
| `ANSIBLE_INVENTORY` | Fallback inventory.ini content when `run_terraform=false` |
| `ECR_REGISTRY` | Fallback ECR registry when `run_terraform=false` |
| `POSTGRES_PASSWORD` | EC2 compose Postgres password |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `JWT_TICKET_SECRET` | Runtime auth/ticket secrets |
| Provider secrets | ZaloPay, OpenWeather, OneSignal, R2/S3 values as needed |

**Removed secrets** (SSH no longer used):
- ~~`TERRAFORM_SSH_PUBLIC_KEY`~~
- ~~`TERRAFORM_ALLOWED_SSH_CIDR`~~
- ~~`EC2_SSH_PRIVATE_KEY`~~

EC2 access now uses AWS Systems Manager (SSM) via the `amazon.aws.aws_ssm`
Ansible connection plugin. No SSH key pair is needed. The deploy credential must
have `ssm:StartSession`, `ssm:TerminateSession`, `ssm:DescribeInstanceInformation`,
and `ec2:DescribeInstances` permissions. The EC2 instance profile (created by
Terraform) includes the AWS-managed `AmazonSSMManagedInstanceCore` policy.

Terraform creates EC2, ECR, security groups, Elastic IP, and optional DNS. Do not
create those manually in the AWS Console for normal deploys.

### Manual deploy workflow

Actions → **Deploy AWS (manual)**:

1. choose `staging` / `production`
2. keep `run_terraform=true` for first deploy or infra changes
3. set `run_ansible=true` to update the EC2 containers after images are pushed

Expected flow:

```text
GitHub manual workflow → Terraform infra → ECR image tags → SSM/Ansible → EC2 docker compose pull/up
```

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
