from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models import *  # noqa: F401,F403
from app.services.seed import seed_reference_data
from sqlalchemy import inspect, text


def ensure_client_patient_numbers() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("clients"):
        return

    columns = {column["name"] for column in inspector.get_columns("clients")}
    dialect = engine.dialect.name
    with engine.begin() as connection:
        if "patient_number" not in columns:
            if dialect == "postgresql":
                connection.execute(text("ALTER TABLE clients ADD COLUMN IF NOT EXISTS patient_number INTEGER"))
            else:
                connection.execute(text("ALTER TABLE clients ADD COLUMN patient_number INTEGER"))

        rows = connection.execute(
            text("SELECT id FROM clients WHERE patient_number IS NULL ORDER BY id")
        ).mappings().all()
        for index, row in enumerate(rows, start=1):
            next_number = connection.execute(text("SELECT COALESCE(MAX(patient_number), 0) + 1 FROM clients")).scalar_one()
            connection.execute(
                text("UPDATE clients SET patient_number = :patient_number WHERE id = :id"),
                {"patient_number": next_number or index, "id": row["id"]},
            )

        if dialect == "postgresql":
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_clients_patient_number ON clients(patient_number)"))
        elif dialect == "sqlite":
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_clients_patient_number ON clients(patient_number)"))


def init_db() -> None:
    ensure_client_patient_numbers()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_reference_data(db)
