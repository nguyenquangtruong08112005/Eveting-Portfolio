@echo off
setlocal
cd /d "%~dp0.."
set COMPOSE=server\infra\docker\docker-compose.observability.yml
echo [obs-down] Stopping observability stack...
docker compose -f "%COMPOSE%" down
endlocal
exit /b %ERRORLEVEL%
