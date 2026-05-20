"""Add explicit numbered blank flags to document templates.

Revision ID: 20260506_0011
Revises: 20260505_0010
Create Date: 2026-05-06
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260506_0011"
down_revision: str | None = "20260505_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


DRIVER_BLANK_TYPE_CODE = "driver_medical_certificate"


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    columns = {col["name"] for col in inspector.get_columns("document_templates")}

    if "requires_numbered_blank" not in columns:
        op.add_column(
            "document_templates",
            sa.Column("requires_numbered_blank", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        )
    if "blank_type" not in columns:
        op.add_column(
            "document_templates",
            sa.Column("blank_type", sa.String(length=80), nullable=True),
        )
        op.create_index("ix_document_templates_blank_type", "document_templates", ["blank_type"])

    op.execute(
        sa.text(
            """
            UPDATE document_templates
            SET requires_numbered_blank = TRUE,
                blank_type = :blank_type
            WHERE (
                lower(coalesce(name, '')) LIKE '%вод%'
                OR lower(coalesce(file_name, '')) LIKE '%вод%'
                OR lower(coalesce(code, '')) LIKE '%driver%'
                OR lower(coalesce(name, '')) LIKE '%driver%'
                OR lower(coalesce(file_name, '')) LIKE '%driver%'
            )
            """
        ).bindparams(blank_type=DRIVER_BLANK_TYPE_CODE)
    )


def downgrade() -> None:
    op.drop_index("ix_document_templates_blank_type", table_name="document_templates")
    op.drop_column("document_templates", "blank_type")
    op.drop_column("document_templates", "requires_numbered_blank")
