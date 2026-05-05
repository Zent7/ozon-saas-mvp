# MedCenters demo runbook

## Quick start

1. Start Docker Desktop.
2. Open PowerShell.
3. Run:

```powershell
cd "C:\path\to\Вова"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\start-demo.ps1
```

The script will:

- create/start PostgreSQL with `docker compose -p medcenters up -d db`;
- use PostgreSQL on `127.0.0.1:5434`;
- create `backend\.venv` and install Python dependencies if missing;
- install frontend dependencies if `frontend\node_modules` is missing;
- run Alembic migrations;
- start the FastAPI backend on `http://127.0.0.1:8000`;
- start Vite on `http://127.0.0.1:5173`;
- open `http://127.0.0.1:5173/demo/index.html`.

## Manual fallback

Database:

```powershell
cd "C:\path\to\Вова"
docker compose -p medcenters up -d db
```

Backend:

```powershell
cd "C:\path\to\Вова\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:DATABASE_URL="postgresql+psycopg://medcenters:medcenters@127.0.0.1:5434/medcenters"
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd "C:\path\to\Вова\frontend"
npm install
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open:

```text
http://127.0.0.1:5173/demo/index.html
```

## Before sending to another computer

Do not include machine-specific/generated folders in an archive:

- `backend\.venv`
- `frontend\node_modules`
- `frontend\dist`
- `.runtime`
- local `*.db`, `*.sqlite`, `*.log`

If Vite says port `5173` is busy, close the process using that port or change the port in both the frontend command and URL.
