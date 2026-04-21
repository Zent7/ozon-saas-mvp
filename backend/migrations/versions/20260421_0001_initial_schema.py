"""initial schema

Revision ID: 20260421_0001
Revises:
Create Date: 2026-04-21 00:01:00
"""

from collections.abc import Sequence

from alembic import op

from app.db.base import Base
from app.models import *  # noqa: F401,F403


revision: str = "20260421_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind())


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
