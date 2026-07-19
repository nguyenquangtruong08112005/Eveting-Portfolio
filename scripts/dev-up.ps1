#Requires -Version 5.1
<#
.SYNOPSIS
  Optional PowerShell entry for Eventing local dev.
  PREFERRED: scripts\dev-up.cmd  (pure CMD, no ExecutionPolicy issues)

  This script always shells out to npm.cmd and opens child cmd.exe windows.
  Never call bare "npm" from PowerShell (resolves to npm.ps1 and can fail).

.USAGE
  scripts\dev-up.cmd
  scripts\dev-up.cmd --no-ngrok
  powershell -ExecutionPolicy Bypass -File scripts\dev-up.ps1 -NoNgrok
#>
param(
  [switch]$NoNgrok,
  [switch]$SkipMigrate,
  [int]$ApiPort = 3000,
  [int]$WebPort = 3000
)

# If someone runs this under a locked-down host, hand off to pure CMD immediately when possible
if (-not $SkipMigrate -and $ApiPort -eq 3000 -and ($WebPort -eq 3000 -or $WebPort -eq 3001)) {
  $pure = Join-Path $PSScriptRoot "dev-up-pure.cmd"
  if (Test-Path $pure) {
    $args = @()
    if ($NoNgrok) { $args += "--no-ngrok" }
    $p = Start-Process -FilePath "cmd.exe" -ArgumentList (@("/c", "`"$pure`"") + $args) -Wait -PassThru -NoNewWindow
    exit $p.ExitCode
  }
}

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Server = Join-Path $Root "server"
$Web = Join-Path $Root "web"

# Prefer npm.cmd (not npm.ps1) — bypasses "running scripts is disabled"
function Get-NpmCmd {
  $cmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $fallback = Join-Path ${env:ProgramFiles} "nodejs\npm.cmd"
  if (Test-Path $fallback) { return $fallback }
  throw "npm.cmd not found. Install Node.js and ensure it is on PATH."
}

function Assert-Cmd($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing command: $name (install it and re-run)"
  }
}

$npm = Get-NpmCmd
Write-Host "==> Eventing dev-up" -ForegroundColor Cyan
Assert-Cmd docker
Assert-Cmd node
Assert-Cmd cmd

# Infra (Postgres + ES)
Write-Host "==> Infra (docker compose)" -ForegroundColor Cyan
Set-Location $Server
& $npm run local:infra
if ($LASTEXITCODE -ne 0) { throw "infra failed" }

Start-Sleep -Seconds 3

if (-not $SkipMigrate) {
  Write-Host "==> DB migrate" -ForegroundColor Cyan
  & $npm run db:migrate
  if ($LASTEXITCODE -ne 0) { throw "migrate failed" }
}

# Child windows use cmd.exe so ExecutionPolicy never blocks npm
Write-Host "==> API (port $ApiPort)" -ForegroundColor Cyan
$apiLine = "cd /d `"$Server`" && set PORT=$ApiPort && `"$npm`" run dev"
Start-Process cmd.exe -ArgumentList @("/k", $apiLine) -WindowStyle Normal

Start-Sleep -Seconds 2

$webPort = $WebPort
if ($webPort -eq $ApiPort) {
  $webPort = 3001
  Write-Host "    Web port shifted to $webPort (API uses $ApiPort)" -ForegroundColor Yellow
}
Write-Host "==> Web (port $webPort)" -ForegroundColor Cyan
$webLine = "cd /d `"$Web`" && if not exist node_modules `"$npm`" install && `"$npm`" run dev -- -p $webPort"
Start-Process cmd.exe -ArgumentList @("/k", $webLine) -WindowStyle Normal

if (-not $NoNgrok) {
  if (Get-Command ngrok -ErrorAction SilentlyContinue) {
    Write-Host "==> ngrok http $ApiPort (temp public URL for mobile)" -ForegroundColor Cyan
    Start-Process cmd.exe -ArgumentList @("/k", "ngrok http $ApiPort") -WindowStyle Normal
    Write-Host "    Copy the https://....ngrok URL into mobile API base URL." -ForegroundColor Yellow
  } else {
    Write-Host "!! ngrok not found — skip (https://ngrok.com/download)" -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "Ready (Eventing):" -ForegroundColor Green
Write-Host "  API:  http://localhost:$ApiPort"
Write-Host "  Web:  http://localhost:$webPort"
Write-Host "  DB:   postgres://eventing:eventing_dev_password@localhost:55432/eventing_dev"
Write-Host "  Stop: scripts\dev-down.cmd"
Write-Host ""
Write-Host "If npm is still blocked, always use:" -ForegroundColor Yellow
Write-Host "  scripts\dev-up.cmd"
Write-Host "  or:  npm.cmd run dev:up"
Write-Host ""
Set-Location $Root
