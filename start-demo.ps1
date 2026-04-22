$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$databaseUrl = "postgresql+psycopg://medcenters:medcenters@127.0.0.1:5434/medcenters"

Write-Host "Starting MedCenters demo..." -ForegroundColor Cyan

try {
  docker start medcenters-db | Out-Null
  Write-Host "PostgreSQL container medcenters-db is running." -ForegroundColor Green
} catch {
  Write-Host "Could not start Docker container medcenters-db. Start Docker Desktop and run again." -ForegroundColor Red
  throw
}

$backendCommand = @"
cd "$backend"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
`$env:DATABASE_URL="$databaseUrl"
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
"@

$frontendCommand = @"
cd "$frontend"
npm run dev -- --host 127.0.0.1 --port 5173
"@

Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand

$backendReady = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  try {
    Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
    $backendReady = $true
    break
  } catch {
    # Backend is still starting.
  }
}

if (-not $backendReady) {
  Write-Host "Backend did not become ready on http://127.0.0.1:8000. Check the backend PowerShell window." -ForegroundColor Red
  throw "Backend startup failed"
}

try {
  $importResult = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/v1/imports/demo-legacy" -TimeoutSec 120
  Write-Host "Legacy demo DB synced. Created: $($importResult.created). Updated: $($importResult.updated). Total: $($importResult.total)." -ForegroundColor Green
} catch {
  Write-Host "Could not sync legacy demo DB. Search may use browser fallback only." -ForegroundColor Yellow
  Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand
Start-Sleep -Seconds 5
Start-Process "http://127.0.0.1:5173/"

Write-Host "Operator workplace opened: http://127.0.0.1:5173/" -ForegroundColor Green
Write-Host "The root address redirects to the exact demo UI: http://127.0.0.1:5173/demo/index.html" -ForegroundColor Green
Write-Host "Search examples: Efimov, Bobkov, Petrov, Starostenko (type in Russian in the browser)" -ForegroundColor Yellow
