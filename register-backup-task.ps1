param(
    [string]$TaskName = "MedCenters Daily Backup",
    [string]$StartTime = "02:00",
    [string]$BackupScriptPath,
    [string]$OutputDir,
    [string]$LogDir,
    [string]$DocumentsDir,
    [int]$KeepLast = 30,
    [int]$RetentionDays = 0,
    [bool]$ArchiveDocuments = $true
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $BackupScriptPath) {
    $BackupScriptPath = Join-Path $root "backup-db.ps1"
}
if (-not $OutputDir) {
    $OutputDir = Join-Path $root "backups"
}
if (-not $LogDir) {
    $LogDir = Join-Path $root "logs\backups"
}
if (-not $DocumentsDir) {
    if ($env:GENERATED_DOCUMENTS_DIR) {
        $DocumentsDir = $env:GENERATED_DOCUMENTS_DIR
    }
    else {
        $DocumentsDir = Join-Path $root "storage\generated"
    }
}

$resolvedBackupScriptPath = [System.IO.Path]::GetFullPath($BackupScriptPath)
if (-not (Test-Path -LiteralPath $resolvedBackupScriptPath)) {
    throw "Backup script not found: $resolvedBackupScriptPath"
}

$scheduledTime = [datetime]::ParseExact($StartTime, "HH:mm", $null)
$scriptArguments = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", ('"{0}"' -f $resolvedBackupScriptPath),
    "-OutputDir", ('"{0}"' -f ([System.IO.Path]::GetFullPath($OutputDir))),
    "-LogDir", ('"{0}"' -f ([System.IO.Path]::GetFullPath($LogDir))),
    "-DocumentsDir", ('"{0}"' -f ([System.IO.Path]::GetFullPath($DocumentsDir))),
    "-KeepLast", $KeepLast,
    "-RetentionDays", $RetentionDays,
    "-ArchiveDocuments", ('$' + $ArchiveDocuments.ToString().ToLower())
) -join " "

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $scriptArguments
$trigger = New-ScheduledTaskTrigger -Daily -At $scheduledTime
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Daily PostgreSQL and generated-documents backup for MedCenters." -Force | Out-Null

Write-Host "Scheduled task '$TaskName' registered." -ForegroundColor Green
Write-Host "Start time: $StartTime"
Write-Host "Backup script: $resolvedBackupScriptPath"
