"""change ozon thresholds from sku to offer_id

Revision ID: 8cd23b9c4621
Revises: 066803f53d01
Create Date: 2026-03-18 16:38:47.114200

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8cd23b9c4621'
down_revision: Union[str, Sequence[str], None] = '066803f53d01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
