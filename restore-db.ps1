param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,

    [string]$ProjectName = "medcenters",
    [string]$ServiceName = "db",
    [string]$DatabaseName = "medcenters",
    [string]$DatabaseUser = "medcenters",

    [switch]$DropExisting
)

$ErrorActionPreference = "Stop"

$resolvedBackup = [System.IO.Path]::GetFullPath($BackupFile)
if (-not (Test-Path -LiteralPath $resolvedBackup)) {
    throw "Backup file not found: $resolvedBackup"
}

Write-Host "Starting PostgreSQL container..." -ForegroundColor Cyan
docker compose -p $ProjectName up -d $ServiceName

if ($DropExisting) {
    Write-Host "Dropping existing public schema before restore..." -ForegroundColor Yellow
    docker compose -p $ProjectName exec -T $ServiceName psql -U $DatabaseUser -d $DatabaseName -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
}

Write-Host "Restoring backup: $resolvedBackup" -ForegroundColor Cyan
Get-Content -LiteralPath $resolvedBackup | docker compose -p $ProjectName exec -T $ServiceName psql -U $DatabaseUser -d $DatabaseName -v ON_ERROR_STOP=1

Write-Host "Restore completed." -ForegroundColor Green
