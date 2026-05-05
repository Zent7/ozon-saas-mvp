"""Hide duplicate neurologist repeat service.

Revision ID: 20260430_0009
Revises: 20260430_0008
Create Date: 2026-04-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260430_0009"
down_revision: str | None = "20260430_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE services
            SET is_active = FALSE
            WHERE legacy_source_id = 36
               OR lower(name) LIKE '%дубл%'
            """
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            UPDATE services
            SET is_active = TRUE
            WHERE legacy_source_id = 36
               OR lower(name) LIKE '%дубл%'
            """
        )
    )
