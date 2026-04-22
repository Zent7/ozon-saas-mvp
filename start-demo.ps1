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
Start-Sleep -Seconds 4
Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand
Start-Sleep -Seconds 5
Start-Process "http://127.0.0.1:5173/demo/index.html"

Write-Host "Exact demo opened: http://127.0.0.1:5173/demo/index.html" -ForegroundColor Green
Write-Host "Backend-connected React app: http://127.0.0.1:5173" -ForegroundColor Green
Write-Host "Search examples: Efimov, Bobkov, Petrov, Starostenko (type in Russian in the browser)" -ForegroundColor Yellow
