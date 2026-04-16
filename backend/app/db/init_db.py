from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import *  # noqa: F401,F403
from app.services.seed import seed_reference_data
from sqlalchemy import inspect, text


LEGACY_IMPORT_COLUMNS = {
    "clients": "legacy_source_id",
    "services": "legacy_source_id",
    "encounters": "legacy_source_id",
    "encounter_services": "legacy_source_id",
    "payments": "legacy_source_id",
}


def add_integer_column_if_missing(connection, dialect: str, table_name: str, column_name: str) -> None:
    if dialect == "postgresql":
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column_name} INTEGER"))
    else:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} INTEGER"))


def create_unique_index_if_possible(connection, dialect: str, table_name: str, column_name: str) -> None:
    index_name = f"ix_{table_name}_{column_name}"
    if dialect in {"postgresql", "sqlite"}:
        connection.execute(text(f"CREATE UNIQUE INDEX IF NOT EXISTS {index_name} ON {table_name}({column_name})"))


def ensure_client_patient_numbers() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("clients"):
        return

    columns = {column["name"] for column in inspector.get_columns("clients")}
    dialect = engine.dialect.name
    with engine.begin() as connection:
        if "patient_number" not in columns:
            add_integer_column_if_missing(connection, dialect, "clients", "patient_number")

        rows = connection.execute(
            text("SELECT id FROM clients WHERE patient_number IS NULL ORDER BY id")
        ).mappings().all()
        for index, row in enumerate(rows, start=1):
            next_number = connection.execute(text("SELECT COALESCE(MAX(patient_number), 0) + 1 FROM clients")).scalar_one()
            connection.execute(
                text("UPDATE clients SET patient_number = :patient_number WHERE id = :id"),
                {"patient_number": next_number or index, "id": row["id"]},
            )

        create_unique_index_if_possible(connection, dialect, "clients", "patient_number")


def ensure_legacy_import_columns() -> None:
    inspector = inspect(engine)
    dialect = engine.dialect.name
    with engine.begin() as connection:
        for table_name, column_name in LEGACY_IMPORT_COLUMNS.items():
            if not inspector.has_table(table_name):
                continue

            columns = {column["name"] for column in inspector.get_columns(table_name)}
            if column_name not in columns:
                add_integer_column_if_missing(connection, dialect, table_name, column_name)

            create_unique_index_if_possible(connection, dialect, table_name, column_name)


def init_db() -> None:
    ensure_client_patient_numbers()
    ensure_legacy_import_columns()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_reference_data(db)
