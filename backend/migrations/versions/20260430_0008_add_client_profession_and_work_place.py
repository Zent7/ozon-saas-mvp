"""Add profession and work place fields to clients.

Revision ID: 20260430_0008
Revises: 20260429_0007
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260430_0008"
down_revision: str | None = "20260429_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    existing_columns = {column["name"] for column in inspector.get_columns("clients")}
    existing_indexes = {index["name"] for index in inspector.get_indexes("clients")}

    if "profession" not in existing_columns:
        op.add_column("clients", sa.Column("profession", sa.String(length=255), nullable=True))
    if "work_place" not in existing_columns:
        op.add_column("clients", sa.Column("work_place", sa.String(length=255), nullable=True))
    if "ix_clients_profession" not in existing_indexes:
        op.create_index("ix_clients_profession", "clients", ["profession"], unique=False)
    if "ix_clients_work_place" not in existing_indexes:
        op.create_index("ix_clients_work_place", "clients", ["work_place"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_clients_work_place", table_name="clients")
    op.drop_index("ix_clients_profession", table_name="clients")
    op.drop_column("clients", "work_place")
    op.drop_column("clients", "profession")
