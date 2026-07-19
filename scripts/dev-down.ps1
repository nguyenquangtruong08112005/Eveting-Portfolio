#Requires -Version 5.1
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$Server = Join-Path $Root "server"
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npm) { $npm = Join-Path ${env:ProgramFiles} "nodejs\npm.cmd" }

Write-Host "==> Stopping Eventing docker infra" -ForegroundColor Cyan
Set-Location $Server
if (Test-Path $npm) { & $npm run local:down 2>$null }
docker stop mobile-eventing-postgres mobile-eventing-redis es01 2>$null
Write-Host "Infra down. Close API/web/ngrok windows if still open." -ForegroundColor Green
Set-Location $Root
