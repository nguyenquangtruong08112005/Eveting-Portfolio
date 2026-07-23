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

This is intentionally one-instance Docker Compose for portfolio demo. RDS/ECS/ALB can be added later, but they are not required for the first public deploy.

### Domain Reverse Proxy & Cloudflare Configuration

- **Web Domain:** `https://eventing.moteo.fun` -> proxied to `web:3000`
- **API Domain:** `https://api.eventing.moteo.fun` -> proxied to `api:3000`

#### Reverse Proxy Architecture (Caddy)
- Caddy is the **sole public 80/443 container** in production.
- API and Web containers run on internal Docker networks and do not expose ports 3000/3001 directly to the host.
- Caddy handles TLS termination/proxying, zstd/gzip compression, and forwards standard headers (`Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`).
- Persistent Caddy data and configuration are preserved via `caddy_data` and `caddy_config` volumes.

#### Required Cloudflare Setup
1. **DNS A Records:**
   - `eventing.moteo.fun` -> EC2 Elastic IP (Proxied, Orange Cloud)
   - `api.eventing.moteo.fun` -> EC2 Elastic IP (Proxied, Orange Cloud)
2. **SSL/TLS Encryption Mode:**
   - Set Cloudflare SSL/TLS encryption mode to **Full** or **Full (strict)** in Cloudflare Dashboard.
   - Do **NOT** select Flexible mode; Flexible causes infinite redirect loops when Caddy enforces HTTPS on origin.

#### CORS Allowlist
- Backend CORS allowlist in `server/src/app.js` is scoped to `https://eventing.moteo.fun` and configured `CORS_ALLOWED_ORIGINS` without wildcard (`*`) access.


### Terraform Remote State & Concurrency

- **State Bucket:** `eventing-tfstate-${ACCOUNT_ID}-${AWS_REGION}` created idempotently via `server/infra/terraform/bootstrap`.
- **First-Run Sequence:**
  1. Pipeline checks `s3://$STATE_BUCKET/bootstrap/${environment}/terraform.tfstate` via `aws s3api head-object`.
  2. If absent (first run): Runs local `terraform apply` to create the S3 bucket, then migrates bootstrap state into S3 via `terraform init -migrate-state -force-copy`.
  3. If present (subsequent runs): Initialises bootstrap directly with S3 backend (`terraform init -reconfigure`) and applies updates using persisted state.
  4. Main Terraform initialises with S3 backend key `eventing/${environment}/terraform.tfstate`.
- **State Safeguards:** S3 versioning enabled, default `AES256` encryption, public access block, 90-day noncurrent version expiration, and S3 native lockfile (`use_lockfile = true`). No DynamoDB required.
- **Required IAM Permissions:**
  - Bucket management: `s3:CreateBucket`, `s3:ListBucket`, `s3:GetBucketLocation`, `s3:GetBucketVersioning`, `s3:PutBucketVersioning`, `s3:GetEncryptionConfiguration`, `s3:PutEncryptionConfiguration`, `s3:GetLifecycleConfiguration`, `s3:PutLifecycleConfiguration`, `s3:GetBucketPublicAccessBlock`, `s3:PutBucketPublicAccessBlock` on `arn:aws:s3:::eventing-tfstate-*`
  - State objects: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::eventing-tfstate-*/bootstrap/*` and `arn:aws:s3:::eventing-tfstate-*/eventing/*`.
- **Workflow Concurrency:** GitHub workflow enforces `concurrency: deploy-${{ inputs.environment }}` to prevent concurrent pipeline runs on the same environment.
- **State Recovery / Rollback:** Prior state file versions are preserved in S3. Use `aws s3api list-object-versions` and `terraform state push` if state recovery is needed.

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
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP server host (`smtp.resend.com`), port (`587`), secure flag (`false`) |
| `SMTP_USER`, `SMTP_PASS` | SMTP username (`resend`) and password/API key (`re_...`) |
| `EMAIL_FROM` | Sender address (e.g., `Eventing <noreply@eventing.moteo.fun>`) |
| `AUTH_MOCK_EMAIL` | `true` for log-only mock mode; `false` for live SMTP delivery |
| Provider secrets | ZaloPay, OpenWeather, OneSignal, R2/S3 values as needed |

#### Resend SMTP Integration Guide
1. Obtain an API key (`re_...`) from your [Resend](https://resend.com) dashboard.
2. Ensure your domain `eventing.moteo.fun` is verified in Resend DNS settings.
3. Configure environment / GitHub secrets:
   - `SMTP_HOST`: `smtp.resend.com`
   - `SMTP_PORT`: `587`
   - `SMTP_SECURE`: `false`
   - `SMTP_USER`: `resend`
   - `SMTP_PASS`: `<your-resend-api-key>`
   - `EMAIL_FROM`: `Eventing <noreply@eventing.moteo.fun>`
   - `AUTH_MOCK_EMAIL`: `false`
4. If `AUTH_MOCK_EMAIL=true` or SMTP credentials are missing, system operates safely in log-only mock mode.

**Removed secrets** (SSH no longer used):
- ~~`TERRAFORM_SSH_PUBLIC_KEY`~~
- ~~`TERRAFORM_ALLOWED_SSH_CIDR`~~
- ~~`EC2_SSH_PRIVATE_KEY`~~

EC2 access now uses AWS Systems Manager (SSM) via the `amazon.aws.aws_ssm`
Ansible connection plugin with an S3 transfer bucket (`ansible_aws_ssm_bucket_name`).
No SSH key pair is needed. The deploy credential on the controller must have:
- SSM: `ssm:StartSession`, `ssm:TerminateSession`, `ssm:DescribeInstanceInformation`, `ec2:DescribeInstances`
- S3 Bucket: `s3:ListBucket`, `s3:GetBucketLocation` on `arn:aws:s3:::<ssm-transfer-bucket>`
- S3 Objects: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` on `arn:aws:s3:::<ssm-transfer-bucket>/*`

The EC2 instance profile (created by Terraform) includes `AmazonSSMManagedInstanceCore` policy and requires no S3 credentials because remote transfers use presigned URLs.

> [!WARNING]
> Module/task arguments can transiently pass runtime secrets through the S3 transfer bucket during execution. Safeguards in place: default `AES256` encryption, public access block, no versioning, and auto-cleanup lifecycle policy (1 day).

Terraform creates EC2, ECR, security groups, Elastic IP, private SSM transfer bucket, and optional DNS. Do not create those manually in the AWS Console for normal deploys.

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
