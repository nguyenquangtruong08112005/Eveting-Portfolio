@echo off
REM Start Prometheus + Loki + Promtail + Grafana + node-exporter
setlocal EnableExtensions
cd /d "%~dp0.."

echo.
echo [obs-up] Working directory: %CD%

set "COMPOSE=server\infra\docker\docker-compose.observability.yml"
if not exist "%COMPOSE%" (
  echo [obs-up] ERROR: compose file missing: %COMPOSE%
  exit /b 1
)

REM Plain progress so pull lines show even when not a TTY (npm/scripts)
set "COMPOSE_PROGRESS=plain"
set "DOCKER_CLI_HINTS=false"

echo [obs-up] docker compose version
docker compose version
if errorlevel 1 (
  echo [obs-up] ERROR: docker compose not available.
  exit /b 1
)

echo.
echo [obs-up] Step 1/2 — pull images (this can take several minutes; you should see layers^)...
echo          Images: prom/prometheus, grafana/loki, grafana/promtail, grafana/grafana, prom/node-exporter
echo.

docker compose -f "%COMPOSE%" pull
if errorlevel 1 (
  echo.
  echo [obs-up] Pull failed or hung network to Docker Hub.
  echo   - Check internet / VPN / corporate proxy
  echo   - Docker Desktop -^> Troubleshoot -^> Restart
  echo   - Manual test:  docker pull grafana/grafana:10.4.1
  exit /b 1
)

echo.
echo [obs-up] Step 2/2 — create and start containers...
docker compose -f "%COMPOSE%" up -d --remove-orphans
if errorlevel 1 (
  echo.
  echo [obs-up] up failed. Ports? 3301 Grafana, 9090 Prometheus, 3100 Loki, 9100 node-exporter
  docker compose -f "%COMPOSE%" ps -a
  exit /b 1
)

echo.
echo [obs-up] Status:
docker compose -f "%COMPOSE%" ps
echo.
echo [obs-up] Grafana:     http://localhost:3301  (admin / admin^)
echo [obs-up] Prometheus:  http://localhost:9090
echo [obs-up] Loki:        http://localhost:3100
echo [obs-up] Admin embed: http://localhost:3001/admin/observability
echo.
endlocal
exit /b 0
