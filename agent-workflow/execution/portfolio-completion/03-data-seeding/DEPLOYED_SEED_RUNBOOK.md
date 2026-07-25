# Deployed EC2 Portfolio Demo Seed Runbook (Phase 03)

## 1. Overview & Deployment Context

This runbook provides the exact, controlled procedures for executing the Phase 03 deterministic Vietnam portfolio seed on a deployed AWS EC2 instance.

> [!WARNING]
> **Deployed Environment Context & Preflight Audit Warning:**  
> A preflight database audit on the deployed `eventing-postgres` database confirmed:
> - `events` = 0
> - `venues` = 0
> - `event_media` = 0
> - `reviews` = 0
> - `users` = 1 (Initial system/migration account)
> 
> **Execution Sequence:** Cleanup (if needed) -> Seed -> Verify -> Reindex.  
> Run `db:seed:clean` ONLY when a previous demo or legacy demo identities exist in the target database prior to seeding.

---

## 2. Zero-Cost Packaging Architecture

- **Bundled Container Tooling:** The seed scripts (`server/scripts/seed/seed.platform.postgres.js`, `clean-demo.js`, `verify-seed.js`) and maintenance reindexer (`server/scripts/maintenance/reindex.elasticsearch.js`) are built directly into the ECR API Docker image during `docker build`.
- **Zero EC2 File Transfer Cost:** There is no need to transfer data files or run `scp`/`sftp` commands to copy seed assets to the remote EC2 instance.
- **External Asset Delivery:** Image and video display data use external CDN and Cloudflare R2 / Unsplash URLs, avoiding local storage overhead on EC2.

---

## 3. Remote Directory & Compose Configuration

> [!NOTE]
> **Deployed Application Directory:**  
> On the remote EC2 host, navigate to `/opt/server-eventing`.  
> *Before running execution commands, confirm the current directory and running service profiles on the EC2 host:*
> ```bash
> cd /opt/server-eventing
> sudo docker compose --env-file .env -f docker-compose.app.yml ps
> ```

---

## 4. Controlled Post-Deploy Remote Execution Procedure

Follow these exact steps sequentially on the remote EC2 server inside `/opt/server-eventing`:

### Step 1: Preflight Container & Database Audit
Verify that the `api`, `postgres`, and `elasticsearch` services are healthy and running:
```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml ps
```

### Step 2: Ensure PostgreSQL Schema Migrations Are Current
Apply any outstanding PostgreSQL schema migrations before seeding:
```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml --profile tools run --rm migrate
```

### Step 3: Cleanup Existing Demo Data (Only If Needed)
> [!NOTE]
> Run `db:seed:clean` ONLY when a previous demo or legacy demo identities exist in the target database environment.

```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml exec -T api node scripts/seed/clean-demo.js
```
*Alternative package script shortcut:*
```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml exec -T api npm run db:seed:clean
```

### Step 4: Execute Controlled Portfolio Demo Seeder
Run the deterministic seed script directly inside the deployed API container:
```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml exec -T api node scripts/seed/seed.platform.postgres.js
```
*Alternative package script shortcut:*
```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml exec -T api npm run db:seed:platform
```

### Step 5: Run Automated Seed Verification Script
Execute the database verification tool to query actual PostgreSQL schema and validate all acceptance counts:
```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml exec -T api node scripts/seed/verify-seed.js
```
*Alternative package script shortcut:*
```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml exec -T api npm run db:seed:verify
```
*Expected Output:* Status `ALL ACCEPTANCE CRITERIA PASSED [OK]` with exit code `0`.

### Step 6: Reindex Elasticsearch Search Cluster
Trigger bulk re-indexing of all 50 seeded published events into Elasticsearch:
```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml exec -T api node scripts/maintenance/reindex.elasticsearch.js
```
*Alternative package script shortcut:*
```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml exec -T api npm run search:reindex
```

### Step 7: Verify API Health & Public Event Search Endpoints
Validate that the public REST API endpoints serve the seeded portfolio content:
```bash
# Check API Health
curl -s http://localhost:3000/health

# Query Public Events Endpoint
curl -s "http://localhost:3000/api/v1/events?limit=5" | head -n 30
```

---

## 5. Rollback & Targeted Cleanup Boundaries

If the demo data needs to be purged without affecting non-demo system records or dropping database tables:

### Targeted Cleanup Command
```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml exec -T api node scripts/seed/clean-demo.js
```
*Alternative package script shortcut:*
```bash
cd /opt/server-eventing
sudo docker compose --env-file .env -f docker-compose.app.yml exec -T api npm run db:seed:clean
```

### Rollback & Cleanup Safety Boundaries
- **Strict Prefix Filtering:** Deletes only records matching `id LIKE 'demo_%'` or associated with known demo emails (`@demo.eventing.moteo.fun`, `@eventing.moteo.fun`).
- **FK-Safe Order:** Deletes child records (tickets, media, reviews, seat holds, order items) before parent records (events, venues, profiles, auth users).
- **Non-Destructive Guardrail:** NEVER runs `DROP TABLE`, `TRUNCATE`, or un-scoped `DELETE FROM`. All real user accounts and production data are preserved intact.

---

## 6. Container Startup Policy
- **Manual Execution Only:** Seeding **MUST NOT** be configured to execute automatically when Docker containers start or restart.
- Seeding and cleanup are strictly on-demand operations executed via the commands documented in Sections 4 and 5 above.
