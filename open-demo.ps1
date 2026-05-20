$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$demoUrl = "http://127.0.0.1:5173/demo/index.html"
$healthUrl = "http://127.0.0.1:8000/api/v1/health"

function Test-Endpoint {
    param(
        [string]$Url
    )

    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 | Out-Null
        return $true
    } catch {
        return $false
    }
}

$frontendReady = Test-Endpoint -Url $demoUrl
$backendReady = Test-Endpoint -Url $healthUrl

if ($frontendReady -and $backendReady) {
    Start-Process $demoUrl
    Write-Host "Demo UI opened: $demoUrl" -ForegroundColor Green
    exit 0
}

Write-Host "Demo is not running yet. Launching full startup..." -ForegroundColor Yellow
& (Join-Path $root "start-demo.ps1")
