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


def upgrade() -> None:
    op.add_column("clients", sa.Column("registration_text", sa.Text(), nullable=True))
    op.add_column("clients", sa.Column("admission_category", sa.String(length=255), nullable=True))
    op.add_column("clients", sa.Column("reference_number", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_gynecologist", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_stomatologist", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_dermatologist", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_neurologist", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_surgeon", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_otolaryngologist", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_ophthalmologist", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_therapist", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_psychiatrist", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_infectionist", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_phthisiatrician", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("doctor_uzist", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("indications", sa.Text(), nullable=True))
    op.add_column("clients", sa.Column("encounter_date_text", sa.String(length=120), nullable=True))
    op.add_column("clients", sa.Column("card_number", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("journal_number", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("no_number", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("flg", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("organization", sa.String(length=255), nullable=True))
    op.add_column("clients", sa.Column("mkb10", sa.String(length=80), nullable=True))
    op.add_column("clients", sa.Column("real_date_text", sa.String(length=120), nullable=True))
    op.add_column("clients", sa.Column("legacy_payload_json", sa.JSON(), nullable=True))
    op.create_index("ix_clients_reference_number", "clients", ["reference_number"])
    op.create_index("ix_clients_card_number", "clients", ["card_number"])
    op.create_index("ix_clients_organization", "clients", ["organization"])
    op.create_index("ix_clients_mkb10", "clients", ["mkb10"])


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
