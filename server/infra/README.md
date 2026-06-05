# Infrastructure Configuration

This directory contains configuration files and documentation for running the external dependencies of the Server-2025-Eventing application locally.

## Local Services (Docker Compose)

The local services are configured under `infra/docker/docker-compose.local.yml` and include:

1. **PostgreSQL** (Port `55432` -> `5432`)
   - Image: `postgres:16-alpine`
   - Container Name: `mobile-eventing-postgres`
   - User: `eventing`
   - Password: `eventing_dev_password`
   - Database: `eventing_dev`
2. **Elasticsearch** (Port `9200` -> `9200`)
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
