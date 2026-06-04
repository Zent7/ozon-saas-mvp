"""Optimize the client search index and latest encounter lookup.

Revision ID: 20260601_0012
Revises: 20260506_0011
Create Date: 2026-06-01
"""

from collections.abc import Sequence

from alembic import op


revision: str = "20260601_0012"
down_revision: str | None = "20260506_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


CLIENT_SEARCH_TEXT = """
lower(
    coalesce(cast(patient_number as varchar), '') || ' ' ||
    coalesce(last_name, '') || ' ' ||
    coalesce(first_name, '') || ' ' ||
    coalesce(middle_name, '') || ' ' ||
    coalesce(phone, '') || ' ' ||
    coalesce(snils, '') || ' ' ||
    coalesce(oms_policy, '') || ' ' ||
    coalesce(document_type, '') || ' ' ||
    coalesce(document_series, '') || ' ' ||
    coalesce(document_number, '') || ' ' ||
    coalesce(address_text, '') || ' ' ||
    coalesce(registration_text, '') || ' ' ||
    coalesce(admission_category, '') || ' ' ||
    coalesce(reference_number, '') || ' ' ||
    coalesce(card_number, '') || ' ' ||
    coalesce(journal_number, '') || ' ' ||
    coalesce(profession, '') || ' ' ||
    coalesce(work_place, '') || ' ' ||
    coalesce(organization, '') || ' ' ||
    coalesce(mkb10, '') || ' ' ||
    replace(
        coalesce(last_name, '') || ' ' ||
        coalesce(first_name, '') || ' ' ||
        coalesce(middle_name, ''),
        ' ',
        ''
    )
)
"""


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS ix_clients_search_text_trgm
        ON clients USING gin (({CLIENT_SEARCH_TEXT}) gin_trgm_ops)
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_encounters_active_client_created
        ON encounters (client_id, created_at DESC, id DESC)
        WHERE deleted_at IS NULL
        """
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("DROP INDEX IF EXISTS ix_encounters_active_client_created")
    op.execute("DROP INDEX IF EXISTS ix_clients_search_text_trgm")
