"""Add doctor roles and service links.

Revision ID: 20260422_0004
Revises: 20260422_0003
Create Date: 2026-04-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260422_0004"
down_revision: str | None = "20260422_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("doctor_roles"):
        op.create_table(
            "doctor_roles",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(length=80), nullable=False),
            sa.Column("name", sa.String(length=120), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code"),
        )

    existing_indexes = {index["name"] for index in inspector.get_indexes("doctor_roles")}
    if "ix_doctor_roles_code" not in existing_indexes:
        op.create_index("ix_doctor_roles_code", "doctor_roles", ["code"])

    if not inspector.has_table("service_doctor_roles"):
        op.create_table(
            "service_doctor_roles",
            sa.Column("service_id", sa.Integer(), nullable=False),
            sa.Column("doctor_role_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["doctor_role_id"], ["doctor_roles.id"]),
            sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
            sa.PrimaryKeyConstraint("service_id", "doctor_role_id"),
        )


def downgrade() -> None:
    op.drop_table("service_doctor_roles")
    op.drop_index("ix_doctor_roles_code", table_name="doctor_roles")
    op.drop_table("doctor_roles")
