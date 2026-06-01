param(
    [switch]$Restart,
    [switch]$CheckOnly,
    [string]$EdgeBindAddress
)

$ErrorActionPreference = "Stop"

$serviceName = "Cloudflared"
$cloudflaredExe = "C:\Cloudflared\bin\cloudflared.exe"
$logPath = "C:\Cloudflared\cloudflared.log"

function Protect-ServiceCommand {
    param([string]$Command)

    return $Command -replace '(?i)(--token\s+)\S+', '$1<redacted>'
}

function Protect-LogLine {
    param([string]$Line)

    return $Line `
        -replace '(?i)(--token\s+)\S+', '$1<redacted>' `
        -replace '(?i)(token[=:]\s*)\S+', '$1<redacted>'
}

function Show-Diagnostics {
    param([Microsoft.Management.Infrastructure.CimInstance]$Service)

    Write-Host "Cloudflared service state:" -ForegroundColor Cyan
    & sc.exe query $serviceName | Out-Host

    $sanitizedCommand = Protect-ServiceCommand $Service.PathName
    Write-Host "Sanitized service command: $sanitizedCommand"
    Write-Host "Uses HTTP/2: $($Service.PathName -match '(?i)--protocol\s+http2')"
    Write-Host "Writes a logfile: $($Service.PathName -match '(?i)--logfile\s+')"
    $edgeBindMatch = [regex]::Match($Service.PathName, '(?i)--edge-bind-address\s+(?<address>\S+)')
    $configuredEdgeBindAddress = if ($edgeBindMatch.Success) { $edgeBindMatch.Groups["address"].Value } else { "not configured" }
    Write-Host "Edge bind address: $configuredEdgeBindAddress"

    Write-Host "DNS checks:" -ForegroundColor Cyan
    foreach ($hostname in @(
        "demo.med-center.online",
        "api.med-center.online",
        "region1.v2.argotunnel.com",
        "region2.v2.argotunnel.com",
        "api.cloudflare.com"
    )) {
        try {
            Resolve-DnsName $hostname -ErrorAction Stop | Out-Null
            Write-Host "  $hostname -> OK" -ForegroundColor Green
        } catch {
            Write-Host "  $hostname -> FAILED" -ForegroundColor Yellow
        }
    }

    $vpnProcessNames = Get-Process -ErrorAction SilentlyContinue |
        Where-Object { $_.ProcessName -match '(?i)happ|sing-box|xray|v2ray|clash|warp|wireguard|openvpn|vpn' } |
        Select-Object -ExpandProperty ProcessName -Unique
    $vpnInterfaceNames = Get-NetIPInterface -ErrorAction SilentlyContinue |
        Where-Object { $_.InterfaceAlias -match '(?i)happ|tun|tap|vpn|warp|wireguard' } |
        Select-Object -ExpandProperty InterfaceAlias -Unique

    if ($vpnProcessNames -or $vpnInterfaceNames) {
        Write-Host "VPN-related components detected. They can interrupt Cloudflared DNS or edge connections." -ForegroundColor Yellow
        if ($vpnProcessNames) {
            Write-Host "  Processes: $($vpnProcessNames -join ', ')"
        }
        if ($vpnInterfaceNames) {
            Write-Host "  Interfaces: $($vpnInterfaceNames -join ', ')"
        }
        Write-Host "  Configure VPN bypass for cloudflared.exe and the domains listed in CLOUDFLARE_TUNNEL.md." -ForegroundColor Yellow
    }

    if (Test-Path -LiteralPath $logPath) {
        Write-Host "Last 50 sanitized log lines:" -ForegroundColor Cyan
        Get-Content -LiteralPath $logPath -Tail 50 | ForEach-Object {
            Protect-LogLine $_
        }
    } else {
        Write-Host "Log file does not exist yet: $logPath" -ForegroundColor Yellow
    }
}

$service = Get-CimInstance Win32_Service -Filter "Name='$serviceName'"
if (-not $service) {
    throw "Windows service '$serviceName' is not installed."
}

if ($CheckOnly) {
    Show-Diagnostics $service
    exit 0
}

$isAdministrator = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdministrator) {
    throw "Administrator privileges are required to update or restart the Cloudflared service. Open PowerShell with 'Run as administrator' and run this command again. Use -CheckOnly for read-only diagnostics."
}

if (-not (Test-Path -LiteralPath $cloudflaredExe)) {
    throw "cloudflared.exe was not found at $cloudflaredExe"
}

$tokenMatch = [regex]::Match($service.PathName, '(?i)--token\s+(?<token>\S+)')
if (-not $tokenMatch.Success) {
    throw "The existing service command does not contain a tunnel token. Install the service with the real token first."
}

$token = $tokenMatch.Groups["token"].Value
$edgeBindArgument = if ($EdgeBindAddress) { " --edge-bind-address $EdgeBindAddress" } else { "" }
$imagePath = "`"$cloudflaredExe`" tunnel --protocol http2$edgeBindArgument --no-autoupdate --loglevel info --logfile `"$logPath`" run --token $token"

& sc.exe config $serviceName binPath= $imagePath start= auto | Out-Host
if ($LASTEXITCODE -ne 0) {
    throw "Could not update the Cloudflared service. Run PowerShell as Administrator."
}

if ($Restart) {
    $currentService = Get-Service -Name $serviceName
    if ($currentService.Status -eq "Running") {
        Restart-Service -Name $serviceName
    } else {
        Start-Service -Name $serviceName
    }
    (Get-Service -Name $serviceName).WaitForStatus("Running", (New-TimeSpan -Seconds 15))
}

Write-Host "Cloudflared service configured for HTTP/2 with logging. The existing tunnel token was reused and was not printed." -ForegroundColor Green
if ($EdgeBindAddress) {
    Write-Host "Cloudflared edge traffic is bound to $EdgeBindAddress." -ForegroundColor Green
}
