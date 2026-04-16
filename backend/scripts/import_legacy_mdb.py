from __future__ import annotations

import argparse
import re
import sys
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

try:
    import pyodbc
except ImportError as exc:  # pragma: no cover - depends on local Windows setup
    raise SystemExit(
        "Не установлен pyodbc. Выполните в backend: python -m pip install -r requirements.txt"
    ) from exc

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.center import Center
from app.models.client import Client
from app.models.encounter import Encounter
from app.models.encounter_service import EncounterService
from app.models.import_batch import ImportBatch
from app.models.payment import Payment
from app.models.service import Service, ServiceCategory
from app.models.user import User

DEFAULT_IMPORTS_DIR = ROOT_DIR / "storage" / "imports"
LEGACY_TABLES = [
    "tblMain",
    "tblVisits",
    "tblServices",
    "tblOrderServices",
    "tblCash",
    "tblTemplates",
    "tblUsers",
]


def find_default_mdb() -> Path:
    files = sorted(DEFAULT_IMPORTS_DIR.glob("*.mdb"))
    if not files:
        raise SystemExit(f"В папке {DEFAULT_IMPORTS_DIR} нет .mdb файла")
    return files[0]


def connect_mdb(path: Path) -> Any:
    connection_string = (
        "Driver={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={path};"
        "ReadOnly=1;"
    )
    return pyodbc.connect(connection_string, autocommit=True)


def fetch_all(connection: Any, query: str) -> list[dict[str, Any]]:
    cursor = connection.cursor()
    cursor.execute(query)
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def scalar(connection: Any, query: str) -> int:
    cursor = connection.cursor()
    cursor.execute(query)
    return int(cursor.fetchone()[0] or 0)


def as_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def as_date(value: Any, fallback: date | None = None) -> date:
    if value is None:
        return fallback or date(1900, 1, 1)
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()
    for fmt in ("%d.%m.%Y", "%Y-%m-%d", "%d.%m.%Y %H:%M:%S"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return fallback or date(1900, 1, 1)


def as_decimal(value: Any) -> Decimal:
    if value is None:
        return Decimal("0")
    try:
        return Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError):
        return Decimal("0")


def slugify(value: str | None, fallback: str) -> str:
    text = (value or fallback).strip().lower()
    text = re.sub(r"[^\w]+", "-", text, flags=re.UNICODE).strip("-")
    return (text or fallback)[:45]


def get_default_center_id(db: Session) -> int:
    center_id = db.execute(select(Center.id).order_by(Center.id)).scalar_one_or_none()
    if center_id is None:
        raise RuntimeError("Нет ни одного центра. Сначала запустите init_db/seed.")
    return center_id


def get_default_user_id(db: Session) -> int | None:
    return db.execute(select(User.id).order_by(User.id)).scalar_one_or_none()


def get_or_create_category(db: Session, name: str | None, cache: dict[str, int]) -> int | None:
    category_name = as_text(name) or "Без категории"
    if category_name in cache:
        return cache[category_name]

    category = db.execute(select(ServiceCategory).where(ServiceCategory.name == category_name)).scalar_one_or_none()
    if category is None:
        next_order = db.execute(select(func.count(ServiceCategory.id))).scalar_one() + 1
        category = ServiceCategory(
            code=f"legacy-cat-{next_order}",
            name=category_name,
            sort_order=100 + int(next_order),
        )
        db.add(category)
        db.flush()

    cache[category_name] = category.id
    return category.id


def preview(path: Path) -> None:
    with connect_mdb(path) as connection:
        print(f"Файл: {path}")
        print("Найденные объемы:")
        for table in LEGACY_TABLES:
            try:
                print(f"- {table}: {scalar(connection, f'SELECT COUNT(*) FROM [{table}]')}")
            except Exception as exc:  # noqa: BLE001 - preview should continue
                print(f"- {table}: ошибка чтения ({exc})")

        print("\nПримеры клиентов:")
        for row in fetch_all(
            connection,
            "SELECT TOP 5 ID, LastName, FirstName, Patronymic, BirthDate, Phone, SNILS, PolisOMS FROM tblMain ORDER BY ID",
        ):
            print(row)

        print("\nПримеры услуг:")
        for row in fetch_all(connection, "SELECT TOP 10 ID, Service, ServiceType, Price FROM tblServices ORDER BY ID"):
            print(row)


def import_clients(connection: Any, db: Session) -> dict[int, int]:
    rows = fetch_all(connection, "SELECT * FROM tblMain ORDER BY ID")
    mapping: dict[int, int] = {}
    next_patient_number = (db.execute(select(func.max(Client.patient_number))).scalar_one() or 0) + 1

    for row in rows:
        legacy_id = int(row["ID"])
        existing = db.execute(select(Client).where(Client.legacy_source_id == legacy_id)).scalar_one_or_none()
        if existing is not None:
            mapping[legacy_id] = existing.id
            continue

        client = Client(
            legacy_source_id=legacy_id,
            patient_number=next_patient_number,
            last_name=as_text(row.get("LastName")) or "Без фамилии",
            first_name=as_text(row.get("FirstName")) or "Без имени",
            middle_name=as_text(row.get("Patronymic")),
            birth_date=as_date(row.get("BirthDate")),
            sex=as_text(row.get("Sex")),
            phone=as_text(row.get("Phone")),
            snils=as_text(row.get("SNILS")),
            oms_policy=as_text(row.get("PolisOMS")),
            address_text=", ".join(
                part
                for part in [
                    as_text(row.get("City")),
                    as_text(row.get("District")),
                    as_text(row.get("Street")),
                    as_text(row.get("HouseNumber")),
                    as_text(row.get("ApartmentNumber")),
                ]
                if part
            )
            or None,
            notes=as_text(row.get("Comments")),
            created_by_user_id=get_default_user_id(db),
        )
        db.add(client)
        db.flush()
        mapping[legacy_id] = client.id
        next_patient_number += 1

    return mapping


def import_services(connection: Any, db: Session) -> dict[int, int]:
    rows = fetch_all(connection, "SELECT * FROM tblServices ORDER BY ID")
    mapping: dict[int, int] = {}
    category_cache: dict[str, int] = {}

    for row in rows:
        legacy_id = int(row["ID"])
        existing = db.execute(select(Service).where(Service.legacy_source_id == legacy_id)).scalar_one_or_none()
        if existing is not None:
            mapping[legacy_id] = existing.id
            continue

        service_name = as_text(row.get("Service")) or f"Услуга {legacy_id}"
        service = Service(
            legacy_source_id=legacy_id,
            category_id=get_or_create_category(db, as_text(row.get("ServiceType")), category_cache),
            code=f"legacy-service-{legacy_id}",
            name=service_name,
            price=as_decimal(row.get("Price")),
            is_active=True,
        )
        db.add(service)
        db.flush()
        mapping[legacy_id] = service.id

    return mapping


def get_or_create_service_from_order(db: Session, row: dict[str, Any], service_mapping: dict[int, int]) -> int:
    legacy_service_id = row.get("ServiceID")
    if legacy_service_id is not None and int(legacy_service_id) in service_mapping:
        return service_mapping[int(legacy_service_id)]

    service_name = as_text(row.get("Service")) or "Услуга из обращения"
    code = f"legacy-order-{slugify(service_name, 'service')[:36]}"
    existing = db.execute(select(Service).where(Service.code == code)).scalar_one_or_none()
    if existing is not None:
        return existing.id

    service = Service(code=code, name=service_name, price=as_decimal(row.get("Price")), is_active=True)
    db.add(service)
    db.flush()
    return service.id


def import_encounters(connection: Any, db: Session, client_mapping: dict[int, int]) -> dict[int, int]:
    rows = fetch_all(connection, "SELECT * FROM tblVisits ORDER BY ID")
    center_id = get_default_center_id(db)
    user_id = get_default_user_id(db)
    mapping: dict[int, int] = {}

    for row in rows:
        legacy_id = int(row["ID"])
        legacy_client_id = row.get("ClientID")
        if legacy_client_id is None or int(legacy_client_id) not in client_mapping:
            continue

        existing = db.execute(select(Encounter).where(Encounter.legacy_source_id == legacy_id)).scalar_one_or_none()
        if existing is not None:
            mapping[legacy_id] = existing.id
            continue

        encounter = Encounter(
            legacy_source_id=legacy_id,
            center_id=center_id,
            client_id=client_mapping[int(legacy_client_id)],
            created_by_user_id=user_id,
            encounter_date=as_date(row.get("VisitDate"), fallback=date.today()),
            payment_type=as_text(row.get("PaymentType")) or "unknown",
            total_amount=as_decimal(row.get("VisitAmount")),
            comment=as_text(row.get("Notes")),
            status="completed",
        )
        db.add(encounter)
        db.flush()
        mapping[legacy_id] = encounter.id

    return mapping


def import_encounter_services(
    connection: Any,
    db: Session,
    encounter_mapping: dict[int, int],
    service_mapping: dict[int, int],
) -> int:
    rows = fetch_all(connection, "SELECT * FROM tblOrderServices ORDER BY ID")
    imported = 0
    for row in rows:
        legacy_id = int(row["ID"])
        legacy_visit_id = row.get("VisitID")
        if legacy_visit_id is None or int(legacy_visit_id) not in encounter_mapping:
            continue

        existing = db.execute(
            select(EncounterService).where(EncounterService.legacy_source_id == legacy_id)
        ).scalar_one_or_none()
        if existing is not None:
            continue

        quantity = int(row.get("Quantity") or 1)
        item = EncounterService(
            legacy_source_id=legacy_id,
            encounter_id=encounter_mapping[int(legacy_visit_id)],
            service_id=get_or_create_service_from_order(db, row, service_mapping),
            quantity=quantity,
            unit_price=as_decimal(row.get("Price")),
            line_total=as_decimal(row.get("Amount")),
            sequence_number=as_text(row.get("ReferenceNumber")) or as_text(row.get("SeriesNumber")),
            notes=as_text(row.get("Notes")),
        )
        db.add(item)
        imported += 1

    return imported


def import_payments(connection: Any, db: Session, encounter_mapping: dict[int, int]) -> int:
    rows = fetch_all(connection, "SELECT * FROM tblCash ORDER BY ID")
    user_id = get_default_user_id(db)
    imported = 0

    for row in rows:
        legacy_id = int(row["ID"])
        legacy_visit_id = row.get("VisitID")
        if legacy_visit_id is None or int(legacy_visit_id) not in encounter_mapping:
            continue

        existing = db.execute(select(Payment).where(Payment.legacy_source_id == legacy_id)).scalar_one_or_none()
        if existing is not None:
            continue

        amount_in = as_decimal(row.get("AmountIn"))
        amount_out = as_decimal(row.get("AmountOut"))
        amount = amount_in if amount_in else -amount_out
        payment = Payment(
            legacy_source_id=legacy_id,
            encounter_id=encounter_mapping[int(legacy_visit_id)],
            payment_date=as_date(row.get("OperationDate"), fallback=date.today()),
            payment_type=as_text(row.get("DocumentName")) or "cash",
            amount=amount,
            status="paid",
            comment=as_text(row.get("OperationTitle")),
            created_by_user_id=user_id,
        )
        db.add(payment)
        imported += 1

    return imported


def run_import(path: Path, commit: bool) -> None:
    init_db()
    with connect_mdb(path) as connection:
        with SessionLocal() as db:
            existing_batch = db.execute(
                select(ImportBatch).where(
                    ImportBatch.source_type == "legacy_mdb",
                    ImportBatch.file_name == path.name,
                    ImportBatch.status == "completed",
                )
            ).scalar_one_or_none()
            if existing_batch is not None:
                raise SystemExit("Этот .mdb уже импортирован. Повторный запуск ничего не изменяет.")

            batch = ImportBatch(source_type="legacy_mdb", file_name=path.name, status="running", stats_json={})
            db.add(batch)
            db.flush()

            client_mapping = import_clients(connection, db)
            service_mapping = import_services(connection, db)
            encounter_mapping = import_encounters(connection, db, client_mapping)
            encounter_services_count = import_encounter_services(connection, db, encounter_mapping, service_mapping)
            payments_count = import_payments(connection, db, encounter_mapping)

            stats = {
                "clients": len(client_mapping),
                "services": len(service_mapping),
                "encounters": len(encounter_mapping),
                "encounter_services": encounter_services_count,
                "payments": payments_count,
            }
            batch.status = "completed" if commit else "preview_rollback"
            batch.stats_json = stats

            if commit:
                db.commit()
            else:
                db.rollback()

            print("Результат импорта:")
            for key, value in stats.items():
                print(f"- {key}: {value}")
            if not commit:
                print("\nЭто был dry-run. Данные не сохранены. Для записи добавьте --commit.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Импорт старой Access .mdb базы в новую систему.")
    parser.add_argument("mode", choices=["preview", "run"], help="preview только читает .mdb, run готовит импорт")
    parser.add_argument("--file", type=Path, default=None, help="Путь к .mdb. По умолчанию первый файл из storage/imports")
    parser.add_argument("--commit", action="store_true", help="Записать данные в новую базу. Без флага будет dry-run.")
    args = parser.parse_args()

    path = args.file or find_default_mdb()
    path = path.resolve()
    if not path.exists():
        raise SystemExit(f"Файл не найден: {path}")

    if args.mode == "preview":
        preview(path)
    else:
        run_import(path, commit=args.commit)


if __name__ == "__main__":
    main()
