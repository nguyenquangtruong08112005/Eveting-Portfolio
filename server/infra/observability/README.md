# Observability stack (local demo)

Prometheus · Loki · Promtail · Grafana · node-exporter

## Quick start

**Prerequisite:** Docker Desktop must be fully running (`docker version` shows Client **and** Server). If `docker` hangs, start/restart Docker Desktop first — do not Ctrl+C mid-hang if you can wait; the script now times out after ~12s.

From monorepo root (`final\`):

```bat
scripts\obs-up.cmd
REM or
npm.cmd run obs:up
```

Or:

```bat
docker compose -f server/infra/docker/docker-compose.observability.yml up -d
```

Stop:

```bat
scripts\obs-down.cmd
npm.cmd run obs:down
```

If you saw `Terminate batch job (Y/N)?` — that is Windows asking after **Ctrl+C** while Docker was hung. Answer `Y`, start Docker Desktop, then run `obs-up` again.

## Ports

| Service | URL |
|---|---|
| **Grafana** | http://localhost:3301 (login `admin` / `admin`; anonymous **Viewer** for iframe) |
| Prometheus | http://localhost:9090 |
| Loki | http://localhost:3100 |
| node-exporter | http://localhost:9100 |

> Grafana uses **3301** so it does not clash with web (`3001`) or API (`3000`).

## Prerequisites

1. API running on host port **3000** with `GET /metrics`
2. Log files under `server/logs/*.log` (Promtail mounts this path)
3. Docker Desktop running

## Admin web embed

Web admin page `/admin/observability` iframes Grafana:

```env
NEXT_PUBLIC_GRAFANA_URL=http://localhost:3301
NEXT_PUBLIC_GRAFANA_DASHBOARD_PATH=/d/eventing-backend/eventing-backend-observability-dashboard?orgId=1&kiosk&theme=dark
```

Embed flags (compose):

- `GF_SECURITY_ALLOW_EMBEDDING=true`
- `GF_AUTH_ANONYMOUS_ENABLED=true` (local demo only — do not expose publicly)

## Security note

Anonymous Viewer + open LAN ports are for **local portfolio demos**. Production should use reverse-proxy auth, disable anonymous access, and not publish Grafana/Prometheus/Loki ports.
