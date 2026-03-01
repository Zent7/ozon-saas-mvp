"""ozon_products_product_id_bigint

Revision ID: 8a2512e25566
Revises: d292748f8afa
Create Date: 2026-03-01 21:56:11.553767
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8a2512e25566"
down_revision: Union[str, Sequence[str], None] = "d292748f8afa"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "ozon_products",
        "product_id",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "ozon_products",
        "product_id",
        existing_type=sa.BigInteger(),
        type_=sa.Integer(),
        existing_nullable=False,
    )