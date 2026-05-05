"""Add profession and work place fields to clients.

Revision ID: 20260430_0008
Revises: 20260429_0007
Create Date: 2026-04-30
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260430_0008"
down_revision: str | None = "20260429_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("clients", sa.Column("profession", sa.String(length=255), nullable=True))
    op.add_column("clients", sa.Column("work_place", sa.String(length=255), nullable=True))
    op.create_index("ix_clients_profession", "clients", ["profession"], unique=False)
    op.create_index("ix_clients_work_place", "clients", ["work_place"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_clients_work_place", table_name="clients")
    op.drop_index("ix_clients_profession", table_name="clients")
    op.drop_column("clients", "work_place")
    op.drop_column("clients", "profession")
