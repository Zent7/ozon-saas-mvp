"""change ozon thresholds from sku to offer_id

Revision ID: a21cd7611c70
Revises: 8cd23b9c4621
Create Date: 2026-03-18 16:40:27.911499

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a21cd7611c70"
down_revision: Union[str, Sequence[str], None] = "8cd23b9c4621"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint(
        "uq_ozon_stock_threshold",
        "ozon_stock_thresholds",
        type_="unique",
    )

    op.add_column(
        "ozon_stock_thresholds",
        sa.Column("offer_id", sa.Text(), nullable=True),
    )

    op.execute(
        """
        UPDATE ozon_stock_thresholds
        SET offer_id = sku
        WHERE offer_id IS NULL
        """
    )

    op.alter_column(
        "ozon_stock_thresholds",
        "offer_id",
        existing_type=sa.Text(),
        nullable=False,
    )

    op.drop_column("ozon_stock_thresholds", "warehouse_id")
    op.drop_column("ozon_stock_thresholds", "sku")

    op.create_unique_constraint(
        "uq_ozon_stock_threshold",
        "ozon_stock_thresholds",
        ["seller_id", "offer_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "uq_ozon_stock_threshold",
        "ozon_stock_thresholds",
        type_="unique",
    )

    op.add_column(
        "ozon_stock_thresholds",
        sa.Column("sku", sa.Text(), nullable=True),
    )
    op.add_column(
        "ozon_stock_thresholds",
        sa.Column("warehouse_id", sa.BigInteger(), nullable=True),
    )

    op.execute(
        """
        UPDATE ozon_stock_thresholds
        SET sku = offer_id
        WHERE sku IS NULL
        """
    )

    op.alter_column(
        "ozon_stock_thresholds",
        "sku",
        existing_type=sa.Text(),
        nullable=False,
    )
    op.execute(
        """
        UPDATE ozon_stock_thresholds
        SET warehouse_id = 0
        WHERE warehouse_id IS NULL
        """
    )
    op.alter_column(
        "ozon_stock_thresholds",
        "warehouse_id",
        existing_type=sa.BigInteger(),
        nullable=False,
    )

    op.drop_column("ozon_stock_thresholds", "offer_id")

    op.create_unique_constraint(
        "uq_ozon_stock_threshold",
        "ozon_stock_thresholds",
        ["seller_id", "sku", "warehouse_id"],
    )