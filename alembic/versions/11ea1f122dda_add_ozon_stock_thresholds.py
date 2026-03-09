"""add ozon_stock_thresholds

Revision ID: 11ea1f122dda
Revises: d292748f8afa
Create Date: 2026-03-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "11ea1f122dda"
down_revision = "d292748f8afa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    op.create_table(
        "ozon_stock_thresholds",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("seller_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sku", sa.Text(), nullable=False),
        sa.Column("warehouse_id", sa.BigInteger(), nullable=False),
        sa.Column("min_stock", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("cooldown_minutes", sa.Integer(), nullable=True),
        sa.Column("last_alert_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("min_stock >= 0", name="ck_ozon_stock_threshold_min_stock_nonneg"),
        sa.UniqueConstraint("seller_id", "sku", "warehouse_id", name="uq_ozon_stock_threshold"),
    )

    op.create_index(
        "ix_ozon_stock_thresholds_seller",
        "ozon_stock_thresholds",
        ["seller_id"],
        unique=False,
    )
    op.create_index(
        "ix_ozon_stock_thresholds_lookup",
        "ozon_stock_thresholds",
        "seller_id sku warehouse_id".split(),
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ozon_stock_thresholds_lookup", table_name="ozon_stock_thresholds")
    op.drop_index("ix_ozon_stock_thresholds_seller", table_name="ozon_stock_thresholds")
    op.drop_table("ozon_stock_thresholds")