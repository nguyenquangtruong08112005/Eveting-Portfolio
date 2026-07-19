@echo off
REM Pure CMD — Eventing local stack (no PowerShell, no npm.ps1)
setlocal EnableExtensions
cd /d "%~dp0.."
set "ROOT=%CD%"
set "API_PORT=3000"
set "WEB_PORT=3001"

REM Optional flags: --no-ngrok
set "DO_NGROK=1"
if /I "%~1"=="--no-ngrok" set "DO_NGROK=0"
if /I "%~1"=="-NoNgrok" set "DO_NGROK=0"

where docker >nul 2>&1 || (
  echo ERROR: docker not found. Install Docker Desktop and retry.
  exit /b 1
)
where npm.cmd >nul 2>&1 || (
  echo ERROR: npm.cmd not found. Install Node.js and ensure it is on PATH.
  exit /b 1
)

echo ==^> Eventing infra ^(Postgres + ES^)
cd /d "%ROOT%\server"
call npm.cmd run local:infra
if errorlevel 1 (
  echo ERROR: infra failed
  exit /b 1
)

REM delay without "timeout" (timeout fails when stdin is redirected)
ping -n 4 127.0.0.1 >nul
echo ==^> DB migrate
call npm.cmd run db:migrate
if errorlevel 1 (
  echo ERROR: migrate failed
  exit /b 1
)

echo ==^> API window :%API_PORT%
start "Eventing-API" cmd /k cd /d "%ROOT%\server" ^& set PORT=%API_PORT% ^& npm.cmd run dev

ping -n 3 127.0.0.1 >nul
echo ==^> Web window :%WEB_PORT%
if not exist "%ROOT%\web\node_modules\" (
  echo     Installing web dependencies...
  pushd "%ROOT%\web"
  call npm.cmd install
  if errorlevel 1 (
    echo ERROR: web npm install failed
    popd
    exit /b 1
  )
  popd
)
start "Eventing-Web" cmd /k cd /d "%ROOT%\web" ^& npm.cmd run dev -- -p %WEB_PORT%

if "%DO_NGROK%"=="1" (
  where ngrok >nul 2>&1
  if not errorlevel 1 (
    echo ==^> ngrok http %API_PORT%
    start "Eventing-ngrok" cmd /k ngrok http %API_PORT%
  ) else (
    echo !! ngrok not found - skip ^(https://ngrok.com/download^)
  )
) else (
  echo ==^> ngrok skipped ^(--no-ngrok^)
)

echo.
echo Ready ^(Eventing^):
echo   API   http://localhost:%API_PORT%
echo   Web   http://localhost:%WEB_PORT%
echo   DB    postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev
echo   Redis redis://localhost:6379
echo   Stop  scripts\dev-down.cmd
echo.
echo NOTE: Always use npm.cmd or this .cmd script.
echo       Bare "npm" in PowerShell may hit ExecutionPolicy on npm.ps1.
echo.
endlocal
exit /b 0
