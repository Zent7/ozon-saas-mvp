param(
    [string]$OutputDir,
    [switch]$IncludeLocalClientExport
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $OutputDir) {
    $OutputDir = Join-Path $root "release"
}

$releaseDir = [System.IO.Path]::GetFullPath($OutputDir)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$archivePath = Join-Path $releaseDir "medcenters-demo_$timestamp.zip"
$stagingDir = Join-Path $releaseDir "medcenters-demo_$timestamp"

New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
if (Test-Path -LiteralPath $stagingDir) {
    throw "Staging directory already exists: $stagingDir"
}

$excludedDirs = @(
    ".git",
    ".idea",
    ".vscode",
    ".runtime",
    "release",
    "backups",
    "storage",
    "backend\storage",
    "frontend-access",
    "review-package-chairman-print-20260518",
    "node_modules",
    "frontend\node_modules",
    "frontend\dist",
    "dist",
    "build",
    ".venv",
    "backend\.venv"
)

$excludedFilePatterns = @(
    "*.db",
    "*.sqlite",
    "*.sqlite3",
    "*.log",
    "*.zip",
    "*.mp4",
    "*.rar",
    "*.pyc",
    "photo_*.jpg",
    "tmp_*",
    "temp_*"
)

if (-not $IncludeLocalClientExport) {
    $excludedFilePatterns += "legacy-data.js"
}

function Test-IsExcludedPath {
    param([string]$RelativePath)

    $normalizedPath = $RelativePath.Replace("/", "\")

    foreach ($dir in $excludedDirs) {
        $normalizedDir = $dir.Replace("/", "\").TrimEnd("\")
        if ($normalizedPath -eq $normalizedDir -or $normalizedPath.StartsWith("$normalizedDir\")) {
            return $true
        }
    }

    if ($normalizedPath -match '(^|\\)__pycache__(\\|$)') {
        return $true
    }

    foreach ($pattern in $excludedFilePatterns) {
        if ([System.Management.Automation.WildcardPattern]::new($pattern, "IgnoreCase").IsMatch([System.IO.Path]::GetFileName($normalizedPath))) {
            return $true
        }
    }

    return $false
}

function Get-RelativePathCompat {
    param(
        [string]$BasePath,
        [string]$FullPath
    )

    $base = [System.IO.Path]::GetFullPath($BasePath).TrimEnd("\") + "\"
    $target = [System.IO.Path]::GetFullPath($FullPath)
    $baseUri = [System.Uri]::new($base)
    $targetUri = [System.Uri]::new($target)
    return [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($targetUri).ToString()).Replace("/", "\")
}

Write-Host "Preparing clean demo package..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

$files = Get-ChildItem -LiteralPath $root -Recurse -File -Force | Where-Object {
    $relative = Get-RelativePathCompat -BasePath $root -FullPath $_.FullName
    -not (Test-IsExcludedPath -RelativePath $relative)
}

foreach ($file in $files) {
    $relative = Get-RelativePathCompat -BasePath $root -FullPath $file.FullName
    $target = Join-Path $stagingDir $relative
    $targetDir = Split-Path -Parent $target
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $target -Force
}

Compress-Archive -LiteralPath $stagingDir -DestinationPath $archivePath -Force
Remove-Item -LiteralPath $stagingDir -Recurse -Force

Write-Host "Demo package saved: $archivePath" -ForegroundColor Green
