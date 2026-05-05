"""Add tracking tables from legacy Excel program.

Revision ID: 20260429_0007
Revises: 20260429_0006
Create Date: 2026-04-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260429_0007"
down_revision: str | None = "20260429_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if not inspector.has_table("medical_records"):
        op.create_table(
            "medical_records",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("client_id", sa.Integer(), nullable=False),
            sa.Column("center_id", sa.Integer(), nullable=True),
            sa.Column("card_number", sa.String(length=80), nullable=True),
            sa.Column("opened_at", sa.Date(), nullable=True),
            sa.Column("insurance_org", sa.String(length=255), nullable=True),
            sa.Column("oms_policy", sa.String(length=80), nullable=True),
            sa.Column("marital_status", sa.String(length=120), nullable=True),
            sa.Column("education", sa.String(length=120), nullable=True),
            sa.Column("employment_status", sa.String(length=120), nullable=True),
            sa.Column("work_place", sa.String(length=255), nullable=True),
            sa.Column("position", sa.String(length=255), nullable=True),
            sa.Column("disability", sa.String(length=255), nullable=True),
            sa.Column("blood_group", sa.String(length=40), nullable=True),
            sa.Column("rh_factor", sa.String(length=40), nullable=True),
            sa.Column("allergies", sa.Text(), nullable=True),
            sa.Column("dispensary_observation", sa.Text(), nullable=True),
            sa.Column("health_group", sa.String(length=120), nullable=True),
            sa.Column("diagnosis", sa.Text(), nullable=True),
            sa.Column("mkb10", sa.String(length=80), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["center_id"], ["centers.id"]),
            sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("client_id"),
        )
        op.create_index("ix_medical_records_client_id", "medical_records", ["client_id"], unique=True)
        op.create_index("ix_medical_records_center_id", "medical_records", ["center_id"])
        op.create_index("ix_medical_records_card_number", "medical_records", ["card_number"])

    if not inspector.has_table("medical_record_entries"):
        op.create_table(
            "medical_record_entries",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("medical_record_id", sa.Integer(), nullable=False),
            sa.Column("encounter_id", sa.Integer(), nullable=True),
            sa.Column("doctor_exam_id", sa.Integer(), nullable=True),
            sa.Column("entry_date", sa.Date(), nullable=True),
            sa.Column("doctor_role_id", sa.String(length=80), nullable=True),
            sa.Column("doctor_name", sa.String(length=255), nullable=True),
            sa.Column("complaints", sa.Text(), nullable=True),
            sa.Column("anamnesis", sa.Text(), nullable=True),
            sa.Column("objective_data", sa.Text(), nullable=True),
            sa.Column("diagnosis", sa.Text(), nullable=True),
            sa.Column("mkb10", sa.String(length=80), nullable=True),
            sa.Column("recommendations", sa.Text(), nullable=True),
            sa.Column("conclusion", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["doctor_exam_id"], ["doctor_exams.id"]),
            sa.ForeignKeyConstraint(["encounter_id"], ["encounters.id"]),
            sa.ForeignKeyConstraint(["medical_record_id"], ["medical_records.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_medical_record_entries_medical_record_id", "medical_record_entries", ["medical_record_id"])
        op.create_index("ix_medical_record_entries_encounter_id", "medical_record_entries", ["encounter_id"])
        op.create_index("ix_medical_record_entries_doctor_exam_id", "medical_record_entries", ["doctor_exam_id"])
        op.create_index("ix_medical_record_entries_entry_date", "medical_record_entries", ["entry_date"])
        op.create_index("ix_medical_record_entries_doctor_role_id", "medical_record_entries", ["doctor_role_id"])

    if not inspector.has_table("document_journal_entries"):
        op.create_table(
            "document_journal_entries",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("journal_code", sa.String(length=80), nullable=False),
            sa.Column("journal_name", sa.String(length=255), nullable=False),
            sa.Column("generated_document_id", sa.Integer(), nullable=True),
            sa.Column("client_id", sa.Integer(), nullable=True),
            sa.Column("encounter_id", sa.Integer(), nullable=True),
            sa.Column("issued_at", sa.Date(), nullable=True),
            sa.Column("series", sa.String(length=40), nullable=True),
            sa.Column("number", sa.String(length=80), nullable=True),
            sa.Column("result_text", sa.Text(), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["encounter_id"], ["encounters.id"]),
            sa.ForeignKeyConstraint(["generated_document_id"], ["generated_documents.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_document_journal_entries_journal_code", "document_journal_entries", ["journal_code"])
        op.create_index("ix_document_journal_entries_generated_document_id", "document_journal_entries", ["generated_document_id"])
        op.create_index("ix_document_journal_entries_client_id", "document_journal_entries", ["client_id"])
        op.create_index("ix_document_journal_entries_encounter_id", "document_journal_entries", ["encounter_id"])
        op.create_index("ix_document_journal_entries_issued_at", "document_journal_entries", ["issued_at"])
        op.create_index("ix_document_journal_entries_number", "document_journal_entries", ["number"])

    if not inspector.has_table("spoiled_certificate_blanks"):
        op.create_table(
            "spoiled_certificate_blanks",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("range_id", sa.Integer(), nullable=True),
            sa.Column("visit_type_id", sa.Integer(), nullable=True),
            sa.Column("series", sa.String(length=40), nullable=True),
            sa.Column("number", sa.String(length=80), nullable=False),
            sa.Column("spoiled_at", sa.Date(), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["range_id"], ["certificate_number_ranges.id"]),
            sa.ForeignKeyConstraint(["visit_type_id"], ["visit_types.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_spoiled_certificate_blanks_range_id", "spoiled_certificate_blanks", ["range_id"])
        op.create_index("ix_spoiled_certificate_blanks_visit_type_id", "spoiled_certificate_blanks", ["visit_type_id"])
        op.create_index("ix_spoiled_certificate_blanks_number", "spoiled_certificate_blanks", ["number"])
        op.create_index("ix_spoiled_certificate_blanks_spoiled_at", "spoiled_certificate_blanks", ["spoiled_at"])

    if not inspector.has_table("patient_consents"):
        op.create_table(
            "patient_consents",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("client_id", sa.Integer(), nullable=False),
            sa.Column("encounter_id", sa.Integer(), nullable=True),
            sa.Column("template_id", sa.Integer(), nullable=True),
            sa.Column("consent_type", sa.String(length=120), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("signed_at", sa.Date(), nullable=True),
            sa.Column("representative_name", sa.String(length=255), nullable=True),
            sa.Column("file_path", sa.String(length=500), nullable=True),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["encounter_id"], ["encounters.id"]),
            sa.ForeignKeyConstraint(["template_id"], ["document_templates.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_patient_consents_client_id", "patient_consents", ["client_id"])
        op.create_index("ix_patient_consents_encounter_id", "patient_consents", ["encounter_id"])
        op.create_index("ix_patient_consents_template_id", "patient_consents", ["template_id"])
        op.create_index("ix_patient_consents_consent_type", "patient_consents", ["consent_type"])
        op.create_index("ix_patient_consents_signed_at", "patient_consents", ["signed_at"])


def downgrade() -> None:
    op.drop_table("patient_consents")
    op.drop_table("spoiled_certificate_blanks")
    op.drop_table("document_journal_entries")
    op.drop_table("medical_record_entries")
    op.drop_table("medical_records")
