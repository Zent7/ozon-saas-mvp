"""Add legacy Excel display fields to clients.

Revision ID: 20260421_0002
Revises: 20260421_0001
Create Date: 2026-04-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260421_0002"
down_revision: str | None = "20260421_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


CLIENT_COLUMNS = [
    sa.Column("registration_text", sa.Text(), nullable=True),
    sa.Column("admission_category", sa.String(length=255), nullable=True),
    sa.Column("reference_number", sa.String(length=80), nullable=True),
    sa.Column("doctor_gynecologist", sa.String(length=80), nullable=True),
    sa.Column("doctor_stomatologist", sa.String(length=80), nullable=True),
    sa.Column("doctor_dermatologist", sa.String(length=80), nullable=True),
    sa.Column("doctor_neurologist", sa.String(length=80), nullable=True),
    sa.Column("doctor_surgeon", sa.String(length=80), nullable=True),
    sa.Column("doctor_otolaryngologist", sa.String(length=80), nullable=True),
    sa.Column("doctor_ophthalmologist", sa.String(length=80), nullable=True),
    sa.Column("doctor_therapist", sa.String(length=80), nullable=True),
    sa.Column("doctor_psychiatrist", sa.String(length=80), nullable=True),
    sa.Column("doctor_infectionist", sa.String(length=80), nullable=True),
    sa.Column("doctor_phthisiatrician", sa.String(length=80), nullable=True),
    sa.Column("doctor_uzist", sa.String(length=80), nullable=True),
    sa.Column("indications", sa.Text(), nullable=True),
    sa.Column("encounter_date_text", sa.String(length=120), nullable=True),
    sa.Column("card_number", sa.String(length=80), nullable=True),
    sa.Column("journal_number", sa.String(length=80), nullable=True),
    sa.Column("no_number", sa.String(length=80), nullable=True),
    sa.Column("flg", sa.String(length=80), nullable=True),
    sa.Column("organization", sa.String(length=255), nullable=True),
    sa.Column("mkb10", sa.String(length=80), nullable=True),
    sa.Column("real_date_text", sa.String(length=120), nullable=True),
    sa.Column("legacy_payload_json", sa.JSON(), nullable=True),
]

CLIENT_INDEXES = [
    ("ix_clients_reference_number", ["reference_number"]),
    ("ix_clients_card_number", ["card_number"]),
    ("ix_clients_organization", ["organization"]),
    ("ix_clients_mkb10", ["mkb10"]),
]


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing_columns = {column["name"] for column in inspector.get_columns("clients")}
    for column in CLIENT_COLUMNS:
        if column.name not in existing_columns:
            op.add_column("clients", column)

    existing_indexes = {index["name"] for index in inspector.get_indexes("clients")}
    for index_name, columns in CLIENT_INDEXES:
        if index_name not in existing_indexes:
            op.create_index(index_name, "clients", columns)


def downgrade() -> None:
    op.drop_index("ix_clients_mkb10", table_name="clients")
    op.drop_index("ix_clients_organization", table_name="clients")
    op.drop_index("ix_clients_card_number", table_name="clients")
    op.drop_index("ix_clients_reference_number", table_name="clients")
    op.drop_column("clients", "legacy_payload_json")
    op.drop_column("clients", "real_date_text")
    op.drop_column("clients", "mkb10")
    op.drop_column("clients", "organization")
    op.drop_column("clients", "flg")
    op.drop_column("clients", "no_number")
    op.drop_column("clients", "journal_number")
    op.drop_column("clients", "card_number")
    op.drop_column("clients", "encounter_date_text")
    op.drop_column("clients", "indications")
    op.drop_column("clients", "doctor_uzist")
    op.drop_column("clients", "doctor_phthisiatrician")
    op.drop_column("clients", "doctor_infectionist")
    op.drop_column("clients", "doctor_psychiatrist")
    op.drop_column("clients", "doctor_therapist")
    op.drop_column("clients", "doctor_ophthalmologist")
    op.drop_column("clients", "doctor_otolaryngologist")
    op.drop_column("clients", "doctor_surgeon")
    op.drop_column("clients", "doctor_neurologist")
    op.drop_column("clients", "doctor_dermatologist")
    op.drop_column("clients", "doctor_stomatologist")
    op.drop_column("clients", "doctor_gynecologist")
    op.drop_column("clients", "reference_number")
    op.drop_column("clients", "admission_category")
    op.drop_column("clients", "registration_text")
