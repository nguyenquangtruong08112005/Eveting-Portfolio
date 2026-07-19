@echo off
REM Eventing — stop local docker infra
setlocal
cd /d "%~dp0..\server"
call npm.cmd run local:down 2>nul
docker stop mobile-eventing-postgres mobile-eventing-redis es01 2>nul
echo Infra down. Close Eventing-API / Eventing-Web / Eventing-ngrok windows if still open.
endlocal
