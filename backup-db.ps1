param(
    [string]$ProjectName = "medcenters",
    [string]$ServiceName = "db",
    [string]$DatabaseName = "medcenters",
    [string]$DatabaseUser = "medcenters",
    [string]$OutputDir,
    [int]$KeepLast = 30,
    [int]$RetentionDays = 0,
    [string]$LogDir,
    [string]$DocumentsDir,
    [bool]$ArchiveDocuments = $true
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Resolve-DefaultDocumentsDir {
    param([string]$RootPath)

    if ($env:GENERATED_DOCUMENTS_DIR) {
        return $env:GENERATED_DOCUMENTS_DIR
    }

    return (Join-Path $RootPath "storage\generated")
}

function Write-BackupLog {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestampLabel = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestampLabel] [$Level] $Message"
    Write-Host $line
    Add-Content -LiteralPath $script:LogFile -Value $line -Encoding UTF8
}

function Invoke-CheckedCommand {
    param(
        [scriptblock]$ScriptBlock,
        [string]$FailureMessage
    )

    & $ScriptBlock
    if ($LASTEXITCODE -ne 0) {
        throw "$FailureMessage Exit code: $LASTEXITCODE"
    }
}

function Get-BackupSetDirectories {
    param([string]$BackupRoot)

    if (-not (Test-Path -LiteralPath $BackupRoot)) {
        return @()
    }

    return @(Get-ChildItem -LiteralPath $BackupRoot -Directory | Where-Object {
        $_.Name -like "medcenters_*"
    } | Sort-Object Name -Descending)
}

function Invoke-RetentionPolicy {
    param(
        [string]$BackupRoot,
        [int]$KeepLastCount,
        [int]$RetentionDaysCount
    )

    $backupDirs = Get-BackupSetDirectories -BackupRoot $BackupRoot
    $toRemove = New-Object System.Collections.Generic.List[System.IO.DirectoryInfo]

    if ($KeepLastCount -gt 0 -and $backupDirs.Count -gt $KeepLastCount) {
        foreach ($dir in $backupDirs[$KeepLastCount..($backupDirs.Count - 1)]) {
            $toRemove.Add($dir)
        }
    }

    if ($RetentionDaysCount -gt 0) {
        $threshold = (Get-Date).AddDays(-$RetentionDaysCount)
        foreach ($dir in $backupDirs) {
            if ($dir.LastWriteTime -lt $threshold) {
                $toRemove.Add($dir)
            }
        }
    }

    foreach ($dir in $toRemove | Sort-Object FullName -Unique) {
        Write-BackupLog "Removing old backup set: $($dir.FullName)" "WARN"
        Remove-Item -LiteralPath $dir.FullName -Recurse -Force
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $OutputDir) {
    $OutputDir = Join-Path $root "backups"
}
if (-not $LogDir) {
    $LogDir = Join-Path $root "logs\backups"
}
if (-not $DocumentsDir) {
    $DocumentsDir = Resolve-DefaultDocumentsDir -RootPath $root
}

$backupRoot = [System.IO.Path]::GetFullPath($OutputDir)
$resolvedLogDir = [System.IO.Path]::GetFullPath($LogDir)
$resolvedDocumentsDir = [System.IO.Path]::GetFullPath($DocumentsDir)
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupSetDir = Join-Path $backupRoot "medcenters_$timestamp"
$databaseBackupFile = Join-Path $backupSetDir "database.sql"
$documentsArchiveFile = Join-Path $backupSetDir "documents.zip"
$manifestFile = Join-Path $backupSetDir "manifest.json"
$script:LogFile = Join-Path $resolvedLogDir "backup_$timestamp.log"
$status = "FAILED"

New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
New-Item -ItemType Directory -Force -Path $resolvedLogDir | Out-Null
New-Item -ItemType Directory -Force -Path $backupSetDir | Out-Null
New-Item -ItemType File -Force -Path $script:LogFile | Out-Null

try {
    Write-BackupLog "Backup started."
    Write-BackupLog "Backup root: $backupRoot"
    Write-BackupLog "Backup set: $backupSetDir"
    Write-BackupLog "Database backup file: $databaseBackupFile"
    Write-BackupLog "Documents directory: $resolvedDocumentsDir"
    Write-BackupLog "Archive documents: $ArchiveDocuments"

    Invoke-CheckedCommand -FailureMessage "PostgreSQL dump failed." -ScriptBlock {
        docker compose -p $ProjectName exec -T $ServiceName pg_dump -U $DatabaseUser -d $DatabaseName |
            Set-Content -LiteralPath $databaseBackupFile -Encoding UTF8
    }
    Write-BackupLog "Database backup completed."

    $documentsArchived = $false
    if ($ArchiveDocuments) {
        if (-not (Test-Path -LiteralPath $resolvedDocumentsDir)) {
            throw "Documents directory not found: $resolvedDocumentsDir"
        }

        if (Test-Path -LiteralPath $documentsArchiveFile) {
            Remove-Item -LiteralPath $documentsArchiveFile -Force
        }

        [System.IO.Compression.ZipFile]::CreateFromDirectory(
            $resolvedDocumentsDir,
            $documentsArchiveFile,
            [System.IO.Compression.CompressionLevel]::Optimal,
            $true
        )
        $documentsArchived = $true
        Write-BackupLog "Documents archive completed: $documentsArchiveFile"
    }

    $manifest = [PSCustomObject]@{
        created_at = (Get-Date).ToString("o")
        status = "SUCCESS"
        project_name = $ProjectName
        service_name = $ServiceName
        database_name = $DatabaseName
        database_user = $DatabaseUser
        database_backup_file = $databaseBackupFile
        documents_directory = $resolvedDocumentsDir
        documents_archive_file = if ($documentsArchived) { $documentsArchiveFile } else { $null }
        archive_documents = $ArchiveDocuments
        keep_last = $KeepLast
        retention_days = $RetentionDays
        log_file = $script:LogFile
    }
    $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestFile -Encoding UTF8
    Write-BackupLog "Manifest created: $manifestFile"

    Invoke-RetentionPolicy -BackupRoot $backupRoot -KeepLastCount $KeepLast -RetentionDaysCount $RetentionDays

    $status = "SUCCESS"
    Write-BackupLog "Backup completed successfully."
}
catch {
    Write-BackupLog $_.Exception.Message "ERROR"
    throw
}
finally {
    $summary = [PSCustomObject]@{
        created_at = (Get-Date).ToString("o")
        status = $status
        backup_set = $backupSetDir
        database_backup_file = if (Test-Path -LiteralPath $databaseBackupFile) { $databaseBackupFile } else { $null }
        documents_archive_file = if (Test-Path -LiteralPath $documentsArchiveFile) { $documentsArchiveFile } else { $null }
        manifest_file = if (Test-Path -LiteralPath $manifestFile) { $manifestFile } else { $null }
        log_file = $script:LogFile
    }
    $summary | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $backupSetDir "summary.json") -Encoding UTF8
}
