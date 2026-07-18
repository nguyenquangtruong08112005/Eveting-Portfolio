#Requires -Version 5.1
<#
.SYNOPSIS
  Master local dev: infra → migrate → API + web + ngrok (Windows).

.USAGE
  From monorepo root:
    pwsh -File scripts/dev-up.ps1
    pwsh -File scripts/dev-up.ps1 -NoNgrok
    pwsh -File scripts/dev-up.ps1 -SkipMigrate

  Stop:
    pwsh -File scripts/dev-down.ps1
#>
param(
  [switch]$NoNgrok,
  [switch]$SkipMigrate,
  [int]$ApiPort = 3000,
  [int]$WebPort = 3000
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Server = Join-Path $Root "server"
$Web = Join-Path $Root "web"

function Assert-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing command: $name (install it and re-run)"
  }
}

Write-Host "==> AuraEvents dev-up" -ForegroundColor Cyan
Assert-Cmd docker
Assert-Cmd node
Assert-Cmd npm

# Infra (Postgres + ES)
Write-Host "==> Infra (docker compose)" -ForegroundColor Cyan
Set-Location $Server
npm run local:infra

# Wait for Postgres briefly
Start-Sleep -Seconds 3

if (-not $SkipMigrate) {
  Write-Host "==> DB migrate" -ForegroundColor Cyan
  npm run db:migrate
}

# API window
Write-Host "==> API (port $ApiPort)" -ForegroundColor Cyan
$apiCmd = "cd `"$Server`"; `$env:PORT='$ApiPort'; npm run dev"
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $apiCmd) -WindowStyle Normal

Start-Sleep -Seconds 2

# Web window (Next default 3000 — if API uses 3000, shift web)
$webPort = $WebPort
if ($webPort -eq $ApiPort) {
  $webPort = 3001
  Write-Host "    Web port shifted to $webPort (API uses $ApiPort)" -ForegroundColor Yellow
}
Write-Host "==> Web (port $webPort)" -ForegroundColor Cyan
$webCmd = "cd `"$Web`"; if (-not (Test-Path node_modules)) { npm install }; npm run dev -- -p $webPort"
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $webCmd) -WindowStyle Normal

# ngrok → API (mobile devices need public HTTPS)
if (-not $NoNgrok) {
  if (Get-Command ngrok -ErrorAction SilentlyContinue) {
    Write-Host "==> ngrok http $ApiPort (temp public URL for mobile)" -ForegroundColor Cyan
    $ngrokCmd = "ngrok http $ApiPort"
    Start-Process powershell -ArgumentList @("-NoExit", "-Command", $ngrokCmd) -WindowStyle Normal
    Write-Host "    Copy the https://....ngrok-free.app URL into mobile BASE_URL / API base." -ForegroundColor Yellow
  } else {
    Write-Host "!! ngrok not found — skip (install: https://ngrok.com/download)" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "Ready:" -ForegroundColor Green
Write-Host "  API:  http://localhost:$ApiPort"
Write-Host "  Web:  http://localhost:$webPort"
Write-Host "  DB:   postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev"
Write-Host "  Stop: pwsh -File scripts/dev-down.ps1"
Write-Host ""
Set-Location $Root
