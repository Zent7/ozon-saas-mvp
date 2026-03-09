"""merge heads

Revision ID: 066803f53d01
Revises: 11ea1f122dda, 8a2512e25566
Create Date: 2026-03-02 17:01:52.480644

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '066803f53d01'
down_revision: Union[str, Sequence[str], None] = ('11ea1f122dda', '8a2512e25566')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
