# Cloudflare Tunnel demo runbook

This setup publishes the local MedCenters demo without a VPS:

- `https://demo.med-center.online` -> `http://127.0.0.1:5173`
- `https://api.med-center.online` -> `http://127.0.0.1:8000`

Use `127.0.0.1`, including the `http://` prefix, for both Cloudflare service
URLs. Do not use `localhost`.

## Secret handling

The Cloudflare Tunnel token must not be added to this repository, `.env`,
documentation, screenshots, commits, or chat messages. The Windows service
already stores the token required to run the remotely managed tunnel.

This project uses a remotely managed tunnel. Do not run `cloudflared tunnel
login`, create `cert.pem`, or set `TUNNEL_ORIGIN_CERT` for the normal demo
startup. An error about a missing origin certificate means that a manual
`cloudflared` command intended for a locally managed tunnel was used. Start or
restart the existing Windows service instead.

Do not run `sc.exe qc Cloudflared` while sharing terminal output: the command can
reveal the token in the service command. Use the sanitized diagnostic command
below instead.

## Cloudflare dashboard routes

In Cloudflare Dashboard:

1. Open `Zero Trust`.
2. Open `Networks` -> `Tunnels`.
3. Select the `medcenter-demo` tunnel.
4. Open `Routes` / `Public Hostnames`.
5. Add these two `Published application` routes:

| Hostname | Service type | Service URL |
| --- | --- | --- |
| `demo.med-center.online` | `HTTP` | `http://127.0.0.1:5173` |
| `api.med-center.online` | `HTTP` | `http://127.0.0.1:8000` |

Cloudflare creates the required DNS records when the routes are saved. If
`api.med-center.online` does not resolve, create or save the second route again.

## Configure the Windows service

Open PowerShell as Administrator from the repository root and run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\configure-cloudflared-service.ps1 -Restart
```

The script reuses the token already stored in the `Cloudflared` Windows service.
It does not print the token. The resulting service command uses HTTP/2 and writes
diagnostic logs to `C:\Cloudflared\cloudflared.log`.

To bind edge traffic to a specific adapter during diagnostics, pass its IPv4
address explicitly:

```powershell
.\configure-cloudflared-service.ps1 -Restart -EdgeBindAddress 192.168.3.16
```

Run the safe diagnostic mode without changing the service:

```powershell
.\configure-cloudflared-service.ps1 -CheckOnly
```

Restart the service manually when needed:

```powershell
sc.exe stop Cloudflared
while ((Get-Service Cloudflared).Status -ne "Stopped") {
    Start-Sleep -Seconds 1
}
sc.exe start Cloudflared
sc.exe query Cloudflared
```

Run `sc.exe stop`, `sc.exe start`, and `.\configure-cloudflared-service.ps1
-Restart` from a PowerShell window opened with `Run as administrator`. Windows
error `5` (`Access is denied`) means the current terminal is not elevated.

If `sc.exe start` returns error `1056`, the previous service instance has not
finished stopping yet or the service is already running. Wait until
`(Get-Service Cloudflared).Status` is `Stopped`, then start it once.

## Demo startup

Start the local application:

```powershell
.\start-demo.ps1
```

Verify local endpoints:

```powershell
curl.exe http://127.0.0.1:5173
curl.exe http://127.0.0.1:8000/docs
curl.exe http://127.0.0.1:8000/health
curl.exe http://127.0.0.1:8000/api/v1/health
```

Verify public endpoints:

```powershell
curl.exe -I https://demo.med-center.online
curl.exe -I https://api.med-center.online/docs
```

Expected public results:

- `demo.med-center.online`: HTTP `200`, `301`, or `302`.
- `api.med-center.online/docs`: HTTP `200`.
- No HTTP `502` or `530`.

## DNS troubleshooting

Check both published hostnames and the Cloudflare edge discovery endpoints:

```powershell
Resolve-DnsName demo.med-center.online
Resolve-DnsName api.med-center.online
nslookup demo.med-center.online
nslookup api.med-center.online
Resolve-DnsName region1.v2.argotunnel.com -Type A -Server 1.1.1.1
Resolve-DnsName region2.v2.argotunnel.com -Type A -Server 1.1.1.1
Resolve-DnsName api.cloudflare.com -Type A -Server 1.1.1.1
```

Interpret the failures in this order:

- Local `127.0.0.1:5173` failure: start or fix the frontend.
- Local `127.0.0.1:8000/docs` failure: start or fix the backend.
- Public HTTP `502` with healthy local services: check the Cloudflare route
  service URL and origin connection.
- Public HTTP `530`: check that the tunnel is running and connected to the
  Cloudflare edge, then check the published route.
- Public HTTP `530` with `The origin has been unregistered from Argo Tunnel`
  while the connector log contains `Registered tunnel connection`: recreate the
  DNS records for both published hostnames so they point to the currently
  selected tunnel, not a deleted tunnel.
- `Could not resolve host` or failed DNS lookup for `api.med-center.online`:
  create or save the API `Published application` route in Cloudflare Dashboard.

## VPN troubleshooting

Happ VPN or another TUN/TAP VPN can alter DNS responses or interrupt the
Cloudflared edge connection. Typical log messages include `TLS handshake with
edge error: EOF`, DNS timeouts for `region1.v2.argotunnel.com`, and lost edge
connections.

If local endpoints work but public requests return HTTP `502` or `530`, disable
Happ temporarily, restart `Cloudflared`, and repeat the public checks. If this
fixes the public URLs, enable Happ again only after configuring split tunneling.

Closing the Happ window may leave its background components active. Before the
control test, exit Happ from the tray menu and verify that no Happ tunnel
components remain:

```powershell
Get-Process Happ,happd,sing-box,xray -ErrorAction SilentlyContinue
Get-NetIPInterface -ErrorAction SilentlyContinue |
    Where-Object InterfaceAlias -Match "happ|tun|tap|vpn"
```

For a clean control test, both commands should return no Happ-related entries.
Then restart `Cloudflared` from an elevated PowerShell window.

If Happ supports process bypass, exclude:

```text
cloudflared.exe
```

If Happ supports domain bypass, add one hostname per line without `https://`,
prefixes, or labels:

```text
api.cloudflare.com
region1.v2.argotunnel.com
region2.v2.argotunnel.com
demo.med-center.online
api.med-center.online
```

If domain suffix rules are supported, the shorter equivalent is:

```text
api.cloudflare.com
v2.argotunnel.com
med-center.online
```

Cloudflare Tunnel uses outbound TCP port `7844` for HTTP/2. Port `443` to
`api.cloudflare.com` is used for optional management checks and updates.
