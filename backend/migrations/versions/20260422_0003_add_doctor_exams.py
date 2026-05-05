"""Add doctor exams.

Revision ID: 20260422_0003
Revises: 20260421_0002
Create Date: 2026-04-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260422_0003"
down_revision: str | None = "20260421_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("doctor_exams"):
        op.create_table(
            "doctor_exams",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("client_id", sa.Integer(), nullable=False),
            sa.Column("encounter_id", sa.Integer(), nullable=True),
            sa.Column("doctor_role_id", sa.String(length=80), nullable=False),
            sa.Column("doctor_name", sa.String(length=255), nullable=True),
            sa.Column("fields_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
            sa.Column("is_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["encounter_id"], ["encounters.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    existing_indexes = {index["name"] for index in inspector.get_indexes("doctor_exams")}
    if "ix_doctor_exams_client_id" not in existing_indexes:
        op.create_index("ix_doctor_exams_client_id", "doctor_exams", ["client_id"])
    if "ix_doctor_exams_doctor_role_id" not in existing_indexes:
        op.create_index("ix_doctor_exams_doctor_role_id", "doctor_exams", ["doctor_role_id"])
    if "ix_doctor_exams_encounter_id" not in existing_indexes:
        op.create_index("ix_doctor_exams_encounter_id", "doctor_exams", ["encounter_id"])


def downgrade() -> None:
    op.drop_index("ix_doctor_exams_encounter_id", table_name="doctor_exams")
    op.drop_index("ix_doctor_exams_doctor_role_id", table_name="doctor_exams")
    op.drop_index("ix_doctor_exams_client_id", table_name="doctor_exams")
    op.drop_table("doctor_exams")
