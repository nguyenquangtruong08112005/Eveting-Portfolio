# Phase O1 - Observability, Logging, And Infra Scaffold

Date: 2026-06-05

Status: complete for server observability scaffold and infra templates.

## Scope

- Server-only.
- No mobile contract changes.
- No API payload changes.
- No database schema changes.
- No provider flip.

## Added

- Local JSONL logger:
  - `logs/app.log`
  - `logs/http.log`
  - `LOG_LEVEL`
  - `LOG_CONSOLE`
- HTTP request logging middleware.
- Prometheus-compatible `GET /metrics`.
- Docker observability stack:
  - Prometheus
  - Grafana
  - Loki
  - Promtail
  - Node Exporter
- Grafana provisioning:
  - Prometheus datasource
  - Loki datasource
  - backend dashboard
- Terraform scaffold:
  - AWS EC2 example only
  - VPC/subnet/security group/key pair/instance
- Ansible scaffold:
  - Docker install role
  - observability compose deployment role
- CMD-friendly scripts:
  - `npm run observability:up`
  - `npm run observability:down`
  - `npm run logs:tail:app`
  - `npm run logs:tail:http`

## Verification

- `npm run ci:check`: passed.
- `npm run db:smoke:auth`: passed.
- `npm run search:reindex`: passed, 18 events indexed.
- `docker compose -f infra\docker\docker-compose.observability.yml config --quiet`: passed.
- `terraform fmt -check infra\terraform`: passed.
- `node --check` for logger, observability middleware, logger config, and log tail script: passed.
- `/metrics` smoke on temporary port `35557`: passed.
- `git diff --check`: passed.
- `codegraph sync . && codegraph status .` in server repo: passed, 140 files indexed.

## Not Verified

- Ansible syntax check was not run because `ansible` is not installed on the Windows host.
- Full `npm run observability:up` container startup was not run in this checkpoint to avoid pulling/running extra containers while the user is using local logs manually.

## Phase A-F Review

- Docs confirm original backend Firebase Exit slices A-F are complete.
- Later phases extend beyond A-F:
  - C1-C12 completed backend PostgreSQL/provider expansion.
  - M1-M11 completed mobile/backend bridge work.
  - N1-N4 completed storage/OneSignal/Firebase cleanup and post-cleanup verification.
- Current remaining architectural work is no longer Firebase exit wiring. It is deeper server domain moduleization.

## Next Slice

Phase O2 should split server by domain modules gradually. Recommended order:

1. `auth`
2. `users`
3. `events`
4. `tickets/payments`
5. `media/storage`
6. `notifications`
7. `organizer/admin`

Each module should own its routes, controller, service, repository selectors, validators, and module-local README before moving to the next one.
