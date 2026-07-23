# Infrastructure Configuration (`server/`)

Local dependencies + AWS deploy primitives for **Eventing** (`server/`).

**Monorepo master scripts:** see `/deploy/README.md` and root `npm run dev:up`.

## Local Services (Docker Compose)

The local services are configured under `infra/docker/docker-compose.local.yml` and include:

1. **PostgreSQL** (Port `55432` -> `5432`)
   - Image: `postgres:16-alpine`
   - Container Name: `mobile-eventing-postgres`
   - User: `eventing`
   - Password: `eventing_dev_password`
   - Database: `eventing_dev`
2. **Redis** (Port `6379` -> `6379`)
   - Image: `redis:7-alpine`
   - Container Name: `mobile-eventing-redis`
   - App env: `REDIS_URL=redis://localhost:6379`
3. **Elasticsearch** (Port `9200` -> `9200`)
   - Cluster Type: `single-node`
   - Security: Disabled (for local development convenience)

### Commands

To spin up the PostgreSQL and Elasticsearch containers in the background, run:

```bash
docker compose -f infra/docker/docker-compose.local.yml up -d
```

To stop the containers and keep data volumes:

```bash
docker compose -f infra/docker/docker-compose.local.yml down
```

To completely reset container states and data volumes:

```bash
docker compose -f infra/docker/docker-compose.local.yml down -v
```

## Observability Stack (Docker Compose)

The observability services are configured under `infra/docker/docker-compose.observability.yml` and include:

1. **Prometheus** (Port `9090` -> `9090`) - Scrapes metrics from backend and node-exporter
2. **Grafana** (Port `3001` -> `3000`) - Dashboards for server monitoring
3. **Loki** (Port `3100` -> `3100`) - Log aggregation engine
4. **Promtail** - Scrapes application and HTTP logs from the host
5. **Node Exporter** (Port `9100` -> `9100`) - Basic system metrics

### Commands (Windows CMD compatible)

To spin up the observability containers in the background, run:

```cmd
docker compose -f infra\docker\docker-compose.observability.yml up -d
```

To stop the containers:

```cmd
docker compose -f infra\docker\docker-compose.observability.yml down
```

To completely reset container states and clean up volumes:

```cmd
docker compose -f infra\docker\docker-compose.observability.yml down -v
```

### Log files

- **Application Logs:** `logs\app.log`
- **HTTP request Logs:** `logs\http.log`
- **Tailing logs (Windows Command Prompt):**
  ```cmd
  npm run logs:tail:app
  npm run logs:tail:http
  ```
