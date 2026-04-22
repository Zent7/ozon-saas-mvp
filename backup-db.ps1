$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backupDir = Join-Path $root "backups"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "medcenters_$timestamp.sql"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

docker exec medcenters-db pg_dump -U medcenters -d medcenters | Set-Content -Encoding UTF8 -Path $backupFile

Write-Host "Backup saved: $backupFile" -ForegroundColor Green
