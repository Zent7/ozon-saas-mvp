$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$venvPath = Join-Path $backend ".venv"
$venvPython = Join-Path $venvPath "Scripts\\python.exe"
$venvActivate = Join-Path $venvPath "Scripts\\Activate.ps1"
$databaseUrl = "postgresql+psycopg://medcenters:medcenters@127.0.0.1:5434/medcenters"

Write-Host "Preparing MedCenters demo..." -ForegroundColor Cyan

Push-Location $root
try {
    docker compose -p medcenters up -d db
    Write-Host "Database container is up." -ForegroundColor Green
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath $venvPython)) {
    Write-Host "Creating backend virtual environment..." -ForegroundColor Yellow
    Push-Location $backend
    try {
        python -m venv .venv
    }
    finally {
        Pop-Location
    }
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
Push-Location $backend
try {
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r requirements.txt
}
finally {
    Pop-Location
}

if (-not (Test-Path -LiteralPath (Join-Path $frontend "node_modules"))) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $frontend
    try {
        npm install
    }
    finally {
        Pop-Location
    }
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
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
"@

Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCommand

$backendReady = $false
for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1
    try {
        Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
        $backendReady = $true
        break
    } catch {
    }
}

if (-not $backendReady) {
    throw "Backend did not become ready on http://127.0.0.1:8000."
}

try {
    $importResult = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/v1/imports/demo-legacy" -TimeoutSec 120
    Write-Host "Legacy demo DB synced. Created: $($importResult.created). Updated: $($importResult.updated). Total: $($importResult.total)." -ForegroundColor Green
} catch {
    Write-Host "Could not sync legacy demo DB automatically." -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCommand
Start-Sleep -Seconds 5
Start-Process "http://127.0.0.1:5173/"

Write-Host "Demo UI opened: http://127.0.0.1:5173/" -ForegroundColor Green
