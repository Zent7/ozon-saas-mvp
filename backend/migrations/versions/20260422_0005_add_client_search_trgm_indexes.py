"""Add trigram indexes for fast client search.

Revision ID: 20260422_0005
Revises: 20260422_0004
Create Date: 2026-04-22
"""

from collections.abc import Sequence

from alembic import op


revision: str = "20260422_0005"
down_revision: str | None = "20260422_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE INDEX IF NOT EXISTS ix_clients_last_name_trgm ON clients USING gin (last_name gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_clients_first_name_trgm ON clients USING gin (first_name gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_clients_middle_name_trgm ON clients USING gin (middle_name gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_clients_phone_trgm ON clients USING gin (phone gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_clients_document_number_trgm ON clients USING gin (document_number gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_clients_snils_trgm ON clients USING gin (snils gin_trgm_ops)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_clients_full_name_trgm "
        "ON clients USING gin ((lower(last_name || ' ' || first_name || ' ' || coalesce(middle_name, ''))) gin_trgm_ops)"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("DROP INDEX IF EXISTS ix_clients_full_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_clients_snils_trgm")
    op.execute("DROP INDEX IF EXISTS ix_clients_document_number_trgm")
    op.execute("DROP INDEX IF EXISTS ix_clients_phone_trgm")
    op.execute("DROP INDEX IF EXISTS ix_clients_middle_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_clients_first_name_trgm")
    op.execute("DROP INDEX IF EXISTS ix_clients_last_name_trgm")
