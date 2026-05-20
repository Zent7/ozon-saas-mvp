param(
    [string]$BackupPath,
    [string]$DatabaseBackupFile,
    [string]$DocumentsArchiveFile,
    [ValidateSet("db", "documents", "full")]
    [string]$Mode = "full",
    [string]$ProjectName = "medcenters",
    [string]$ServiceName = "db",
    [string]$DatabaseName = "medcenters",
    [string]$DatabaseUser = "medcenters",
    [string]$DocumentsTargetDir,
    [switch]$DropExisting,
    [switch]$ReplaceDocuments,
    [switch]$ValidateOnly
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

function Write-RestoreLog {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )

    $timestampLabel = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestampLabel] [$Level] $Message"
}

function Resolve-InputPath {
    param([string]$PathValue)

    if (-not $PathValue) {
        return $null
    }

    return [System.IO.Path]::GetFullPath($PathValue)
}

function Resolve-RestoreInputs {
    param(
        [string]$IncomingBackupPath,
        [string]$IncomingDatabaseBackupFile,
        [string]$IncomingDocumentsArchiveFile,
        [string]$RestoreMode
    )

    $resolvedBackupPath = Resolve-InputPath -PathValue $IncomingBackupPath
    $resolvedDbFile = Resolve-InputPath -PathValue $IncomingDatabaseBackupFile
    $resolvedDocsFile = Resolve-InputPath -PathValue $IncomingDocumentsArchiveFile

    if ($resolvedBackupPath) {
        if (-not (Test-Path -LiteralPath $resolvedBackupPath)) {
            throw "Backup path not found: $resolvedBackupPath"
        }

        $backupItem = Get-Item -LiteralPath $resolvedBackupPath
        if ($backupItem.PSIsContainer) {
            if (-not $resolvedDbFile) {
                $candidateDbFile = Join-Path $resolvedBackupPath "database.sql"
                if (Test-Path -LiteralPath $candidateDbFile) {
                    $resolvedDbFile = $candidateDbFile
                }
            }
            if (-not $resolvedDocsFile) {
                $candidateDocsFile = Join-Path $resolvedBackupPath "documents.zip"
                if (Test-Path -LiteralPath $candidateDocsFile) {
                    $resolvedDocsFile = $candidateDocsFile
                }
            }
        }
        else {
            switch ($RestoreMode) {
                "db" {
                    if (-not $resolvedDbFile) {
                        $resolvedDbFile = $resolvedBackupPath
                    }
                }
                "documents" {
                    if (-not $resolvedDocsFile) {
                        $resolvedDocsFile = $resolvedBackupPath
                    }
                }
                default {
                    throw "BackupPath must be a backup set directory when Mode=full."
                }
            }
        }
    }

    if ($RestoreMode -in @("db", "full") -and -not $resolvedDbFile) {
        throw "Database backup file is required for restore mode '$RestoreMode'."
    }
    if ($RestoreMode -in @("documents", "full") -and -not $resolvedDocsFile) {
        throw "Documents archive file is required for restore mode '$RestoreMode'."
    }

    return @{
        DatabaseBackupFile = $resolvedDbFile
        DocumentsArchiveFile = $resolvedDocsFile
    }
}

function Test-RestoreInputs {
    param(
        [string]$ResolvedDatabaseBackupFile,
        [string]$ResolvedDocumentsArchiveFile,
        [string]$RestoreMode,
        [string]$ResolvedDocumentsTargetDir
    )

    if ($RestoreMode -in @("db", "full")) {
        if (-not (Test-Path -LiteralPath $ResolvedDatabaseBackupFile)) {
            throw "Database backup file not found: $ResolvedDatabaseBackupFile"
        }
        if ([System.IO.Path]::GetExtension($ResolvedDatabaseBackupFile) -ne ".sql") {
            throw "Database backup file must be a .sql file: $ResolvedDatabaseBackupFile"
        }
    }

    if ($RestoreMode -in @("documents", "full")) {
        if (-not (Test-Path -LiteralPath $ResolvedDocumentsArchiveFile)) {
            throw "Documents archive file not found: $ResolvedDocumentsArchiveFile"
        }
        if ([System.IO.Path]::GetExtension($ResolvedDocumentsArchiveFile) -ne ".zip") {
            throw "Documents archive file must be a .zip file: $ResolvedDocumentsArchiveFile"
        }

        $targetFullPath = [System.IO.Path]::GetFullPath($ResolvedDocumentsTargetDir)
        if ($targetFullPath -match '^[A-Za-z]:\\$') {
            throw "Refusing to restore documents into a drive root: $targetFullPath"
        }

        $zip = [System.IO.Compression.ZipFile]::OpenRead($ResolvedDocumentsArchiveFile)
        try {
            if ($zip.Entries.Count -eq 0) {
                throw "Documents archive is empty: $ResolvedDocumentsArchiveFile"
            }
        }
        finally {
            $zip.Dispose()
        }
    }
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

function Restore-DocumentsArchive {
    param(
        [string]$ArchiveFile,
        [string]$TargetDir,
        [switch]$ReplaceTarget
    )

    $targetDirFullPath = [System.IO.Path]::GetFullPath($TargetDir)
    $targetParentDir = Split-Path -Parent $targetDirFullPath
    $targetLeafName = Split-Path -Leaf $targetDirFullPath
    $tempExtractDir = Join-Path ([System.IO.Path]::GetTempPath()) ("medcenters_restore_" + [guid]::NewGuid().ToString("N"))

    New-Item -ItemType Directory -Force -Path $tempExtractDir | Out-Null
    try {
        Expand-Archive -LiteralPath $ArchiveFile -DestinationPath $tempExtractDir -Force

        $children = @(Get-ChildItem -LiteralPath $tempExtractDir -Force)
        $sourceRoot = $tempExtractDir
        if ($children.Count -eq 1 -and $children[0].PSIsContainer -and $children[0].Name -eq $targetLeafName) {
            $sourceRoot = $children[0].FullName
        }

        New-Item -ItemType Directory -Force -Path $targetParentDir | Out-Null
        if ($ReplaceTarget -and (Test-Path -LiteralPath $targetDirFullPath)) {
            Remove-Item -LiteralPath $targetDirFullPath -Recurse -Force
        }

        if (-not (Test-Path -LiteralPath $targetDirFullPath)) {
            New-Item -ItemType Directory -Force -Path $targetDirFullPath | Out-Null
        }

        $sourceItems = @(Get-ChildItem -LiteralPath $sourceRoot -Force)
        foreach ($item in $sourceItems) {
            Copy-Item -LiteralPath $item.FullName -Destination $targetDirFullPath -Recurse -Force
        }
    }
    finally {
        if (Test-Path -LiteralPath $tempExtractDir) {
            Remove-Item -LiteralPath $tempExtractDir -Recurse -Force
        }
    }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $DocumentsTargetDir) {
    $DocumentsTargetDir = Resolve-DefaultDocumentsDir -RootPath $root
}

$resolvedDocumentsTargetDir = [System.IO.Path]::GetFullPath($DocumentsTargetDir)
$resolvedInputs = Resolve-RestoreInputs `
    -IncomingBackupPath $BackupPath `
    -IncomingDatabaseBackupFile $DatabaseBackupFile `
    -IncomingDocumentsArchiveFile $DocumentsArchiveFile `
    -RestoreMode $Mode

$resolvedDatabaseBackupFile = $resolvedInputs.DatabaseBackupFile
$resolvedDocumentsArchiveFile = $resolvedInputs.DocumentsArchiveFile

Test-RestoreInputs `
    -ResolvedDatabaseBackupFile $resolvedDatabaseBackupFile `
    -ResolvedDocumentsArchiveFile $resolvedDocumentsArchiveFile `
    -RestoreMode $Mode `
    -ResolvedDocumentsTargetDir $resolvedDocumentsTargetDir

Write-RestoreLog "Validation passed."
Write-RestoreLog "Mode: $Mode"
Write-RestoreLog "Database backup: $resolvedDatabaseBackupFile"
Write-RestoreLog "Documents archive: $resolvedDocumentsArchiveFile"
Write-RestoreLog "Documents target: $resolvedDocumentsTargetDir"

if ($ValidateOnly) {
    Write-RestoreLog "ValidateOnly mode enabled. Restore was not executed."
    return
}

if ($Mode -in @("db", "full")) {
    Write-RestoreLog "Starting PostgreSQL container..."
    Invoke-CheckedCommand -FailureMessage "Failed to start PostgreSQL container." -ScriptBlock {
        docker compose -p $ProjectName up -d $ServiceName
    }

    if ($DropExisting) {
        Write-RestoreLog "Dropping existing public schema before restore..." "WARN"
        Invoke-CheckedCommand -FailureMessage "Failed to drop existing schema." -ScriptBlock {
            docker compose -p $ProjectName exec -T $ServiceName psql -U $DatabaseUser -d $DatabaseName -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
        }
    }

    Write-RestoreLog "Restoring database from $resolvedDatabaseBackupFile"
    Invoke-CheckedCommand -FailureMessage "Database restore failed." -ScriptBlock {
        Get-Content -LiteralPath $resolvedDatabaseBackupFile | docker compose -p $ProjectName exec -T $ServiceName psql -U $DatabaseUser -d $DatabaseName -v ON_ERROR_STOP=1
    }
    Write-RestoreLog "Database restore completed."
}

if ($Mode -in @("documents", "full")) {
    Write-RestoreLog "Restoring documents to $resolvedDocumentsTargetDir"
    Restore-DocumentsArchive -ArchiveFile $resolvedDocumentsArchiveFile -TargetDir $resolvedDocumentsTargetDir -ReplaceTarget:$ReplaceDocuments
    Write-RestoreLog "Documents restore completed."
}

Write-RestoreLog "Restore finished successfully."
