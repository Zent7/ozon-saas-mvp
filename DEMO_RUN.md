# MedCenters demo runbook

## Local demo

1. Start Docker Desktop.
2. Open PowerShell.
3. Run:

```powershell
cd "C:\Users\mihd0\Downloads\Вова"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\start-demo.ps1
```

The script starts PostgreSQL, backend, frontend, and opens:

```text
http://127.0.0.1:5173
```

Search examples:

```text
Ефим
Бобков
Петров
Старостенко
```

## What to show the client

1. The cursor is already in the client search field.
2. Search a client by surname.
3. Select the row in the Excel-like table.
4. Show the lower client card with real imported fields.
5. Select several services.
6. Show automatic total amount.
7. Click "Оформить обращение".
8. Click "Сформировать справку".

## Later production deployment

For the client's website/server we should not run Vite dev mode. The production plan is:

1. VPS/server with PostgreSQL.
2. Backend as a system service.
3. Frontend built with `npm run build`.
4. Nginx serves the frontend and proxies `/api` to backend.
5. Domain + HTTPS certificate.
6. Scheduled PostgreSQL backups.
