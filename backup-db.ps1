param(
    [string]$ProjectName = "medcenters",
    [string]$ServiceName = "db",
    [string]$DatabaseName = "medcenters",
    [string]$DatabaseUser = "medcenters",
    [string]$OutputDir
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $OutputDir) {
    $OutputDir = Join-Path $root "backups"
}

$backupDir = [System.IO.Path]::GetFullPath($OutputDir)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "medcenters_$timestamp.sql"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Host "Creating PostgreSQL backup through docker compose project '$ProjectName'..." -ForegroundColor Cyan
docker compose -p $ProjectName exec -T $ServiceName pg_dump -U $DatabaseUser -d $DatabaseName | Set-Content -Encoding UTF8 -Path $backupFile

Write-Host "Backup saved: $backupFile" -ForegroundColor Green
