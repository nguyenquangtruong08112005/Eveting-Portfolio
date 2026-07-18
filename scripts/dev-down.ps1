#Requires -Version 5.1
<#
  Stop local infra containers. Does not kill every node window (close those manually).
#>
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent $PSScriptRoot
$Server = Join-Path $Root "server"

Write-Host "==> Stopping docker infra" -ForegroundColor Cyan
Set-Location $Server
npm run local:down 2>$null
docker stop mobile-eventing-postgres es01 2>$null

Write-Host "Infra down. Close API/web/ngrok terminal windows if still open." -ForegroundColor Green
Set-Location $Root
