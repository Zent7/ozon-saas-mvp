# Backend

Backend для медицинской системы построен на FastAPI, SQLAlchemy и PostgreSQL.

## Локальный запуск в PowerShell

```powershell
cd C:\Users\mihd0\Downloads\Вова\backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
$env:DATABASE_URL="postgresql+psycopg://medcenters:medcenters@127.0.0.1:5434/medcenters"
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

Backend считает PostgreSQL основной рабочей БД. Запуск с SQLite по умолчанию запрещён.
Временный запуск на SQLite допустим только для локальной диагностики с явным `ALLOW_SQLITE=true`.

Swagger открывается по адресу:

```text
http://127.0.0.1:8000/docs
```

Проверка, что backend реально поднялся на PostgreSQL:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/health"
```

В ответе должно быть:

- `"status": "ok"`
- `"database_ok": true`
- `"database_dialect": "postgresql"`

## Миграции БД

Структура базы ведется через Alembic. Перед первым запуском на новой базе нужно выполнить:

```powershell
python -m alembic upgrade head
```

Создание новой миграции после изменения моделей:

```powershell
python -m alembic revision --autogenerate -m "описание изменения"
python -m alembic upgrade head
```

Проверка, что модели и база не расходятся:

```powershell
python -m alembic check
```

## Что уже заложено

- PostgreSQL как основная база.
- Alembic для контроля структуры БД.
- API для клиентов, обращений, услуг, документов и повторов.
- Быстрый поиск клиентов через backend.
- Нумерация пациентов.
- Seed-данные для первого запуска.
- Каталог реальных шаблонов документов и XML.
- Базовая генерация документов из подключенных шаблонов.
