# Production deployment checklist

This project is prepared for a standard VPS deployment:

1. PostgreSQL database on the server.
2. FastAPI backend as a persistent service.
3. Built frontend from `frontend/dist` served by Nginx.
4. Nginx reverse proxy from `/api` to backend.
5. HTTPS certificate through Certbot.
6. Scheduled database backups with `backup-db.ps1` locally or `pg_dump` on Linux.

Recommended production environment variables:

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@127.0.0.1:5432/medcenters
FRONTEND_ORIGIN=https://your-domain.ru
GENERATED_DOCUMENTS_DIR=/var/lib/medcenters/generated
DELETION_NOTIFY_EMAIL=admin@your-domain.ru
SMTP_HOST=smtp.your-provider.ru
SMTP_PORT=587
SMTP_USER=admin@your-domain.ru
SMTP_PASSWORD=change-me
SMTP_FROM=admin@your-domain.ru
```

Backend service command:

```bash
cd /opt/medcenters/backend
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend build:

```bash
cd /opt/medcenters/frontend
npm ci
npm run build
```

Nginx should serve `frontend/dist` and proxy `/api/v1/` to `http://127.0.0.1:8000/api/v1/`.
