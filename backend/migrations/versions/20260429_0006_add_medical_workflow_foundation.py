"""Add medical workflow foundation tables.

Revision ID: 20260429_0006
Revises: 20260422_0005
Create Date: 2026-04-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260429_0006"
down_revision: str | None = "20260422_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _column_names(table_name: str) -> set[str]:
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table(table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    if column.name not in _column_names(table_name):
        op.add_column(table_name, column)


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if not inspector.has_table("visit_types"):
        op.create_table(
            "visit_types",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("code", sa.String(length=80), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code"),
        )
        op.create_index("ix_visit_types_code", "visit_types", ["code"])
        op.create_index("ix_visit_types_name", "visit_types", ["name"])

    if not inspector.has_table("visit_type_services"):
        op.create_table(
            "visit_type_services",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("visit_type_id", sa.Integer(), nullable=False),
            sa.Column("service_id", sa.Integer(), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="100"),
            sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
            sa.ForeignKeyConstraint(["visit_type_id"], ["visit_types.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_visit_type_services_visit_type_id", "visit_type_services", ["visit_type_id"])
        op.create_index("ix_visit_type_services_service_id", "visit_type_services", ["service_id"])

    if not inspector.has_table("generated_documents"):
        op.create_table(
            "generated_documents",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("encounter_id", sa.Integer(), nullable=True),
            sa.Column("client_id", sa.Integer(), nullable=False),
            sa.Column("template_id", sa.Integer(), nullable=False),
            sa.Column("document_number", sa.String(length=80), nullable=True),
            sa.Column("series", sa.String(length=40), nullable=True),
            sa.Column("file_name", sa.String(length=255), nullable=False),
            sa.Column("file_path", sa.String(length=500), nullable=False),
            sa.Column("generated_by_user_id", sa.Integer(), nullable=True),
            sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
            sa.ForeignKeyConstraint(["encounter_id"], ["encounters.id"]),
            sa.ForeignKeyConstraint(["generated_by_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["template_id"], ["document_templates.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_generated_documents_client_id", "generated_documents", ["client_id"])
        op.create_index("ix_generated_documents_encounter_id", "generated_documents", ["encounter_id"])
        op.create_index("ix_generated_documents_template_id", "generated_documents", ["template_id"])
        op.create_index("ix_generated_documents_document_number", "generated_documents", ["document_number"])

    if not inspector.has_table("certificate_number_ranges"):
        op.create_table(
            "certificate_number_ranges",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("visit_type_id", sa.Integer(), nullable=True),
            sa.Column("service_id", sa.Integer(), nullable=True),
            sa.Column("series", sa.String(length=40), nullable=True),
            sa.Column("number_from", sa.Integer(), nullable=False),
            sa.Column("number_to", sa.Integer(), nullable=False),
            sa.Column("current_number", sa.Integer(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
            sa.ForeignKeyConstraint(["visit_type_id"], ["visit_types.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_certificate_number_ranges_visit_type_id", "certificate_number_ranges", ["visit_type_id"])
        op.create_index("ix_certificate_number_ranges_service_id", "certificate_number_ranges", ["service_id"])
        op.create_index("ix_certificate_number_ranges_series", "certificate_number_ranges", ["series"])

    if not inspector.has_table("template_phrases"):
        op.create_table(
            "template_phrases",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("doctor_role_id", sa.Integer(), nullable=True),
            sa.Column("service_id", sa.Integer(), nullable=True),
            sa.Column("code", sa.String(length=80), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("text", sa.Text(), nullable=False),
            sa.Column("gender", sa.String(length=20), nullable=True),
            sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["doctor_role_id"], ["doctor_roles.id"]),
            sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_template_phrases_doctor_role_id", "template_phrases", ["doctor_role_id"])
        op.create_index("ix_template_phrases_service_id", "template_phrases", ["service_id"])
        op.create_index("ix_template_phrases_code", "template_phrases", ["code"])

    for column_name, column_type in {
        "legal_name": sa.String(length=255),
        "address": sa.String(length=500),
        "phone": sa.String(length=80),
        "email": sa.String(length=255),
        "inn": sa.String(length=30),
        "ogrn": sa.String(length=30),
        "license_number": sa.String(length=120),
        "license_date": sa.String(length=80),
    }.items():
        _add_column_if_missing("centers", sa.Column(column_name, column_type, nullable=True))

    _add_column_if_missing("encounters", sa.Column("visit_type_id", sa.Integer(), nullable=True))
    _add_column_if_missing("encounters", sa.Column("final_result", sa.Text(), nullable=True))
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_encounters_visit_type_id_visit_types') THEN "
            "ALTER TABLE encounters ADD CONSTRAINT fk_encounters_visit_type_id_visit_types "
            "FOREIGN KEY (visit_type_id) REFERENCES visit_types(id); "
            "END IF; END $$;"
        )
    op.execute("CREATE INDEX IF NOT EXISTS ix_encounters_visit_type_id ON encounters(visit_type_id)")

    for column_name, column_type in {
        "doctor_id": sa.Integer(),
        "result_text": sa.String(length=1000),
        "diagnosis": sa.String(length=1000),
        "comment": sa.String(length=1000),
        "completed_at": sa.DateTime(timezone=True),
    }.items():
        _add_column_if_missing("doctor_exams", sa.Column(column_name, column_type, nullable=True))
    op.execute("CREATE INDEX IF NOT EXISTS ix_doctor_exams_doctor_id ON doctor_exams(doctor_id)")

    _add_column_if_missing("document_templates", sa.Column("visit_type_id", sa.Integer(), nullable=True))
    _add_column_if_missing(
        "document_templates",
        sa.Column("output_format", sa.String(length=50), nullable=False, server_default="docx"),
    )
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            "DO $$ BEGIN "
            "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_document_templates_visit_type_id_visit_types') THEN "
            "ALTER TABLE document_templates ADD CONSTRAINT fk_document_templates_visit_type_id_visit_types "
            "FOREIGN KEY (visit_type_id) REFERENCES visit_types(id); "
            "END IF; END $$;"
        )
    op.execute("CREATE INDEX IF NOT EXISTS ix_document_templates_visit_type_id ON document_templates(visit_type_id)")


def downgrade() -> None:
    op.drop_index("ix_document_templates_visit_type_id", table_name="document_templates")
    op.drop_column("document_templates", "output_format")
    op.drop_column("document_templates", "visit_type_id")
    op.drop_index("ix_doctor_exams_doctor_id", table_name="doctor_exams")
    op.drop_column("doctor_exams", "completed_at")
    op.drop_column("doctor_exams", "comment")
    op.drop_column("doctor_exams", "diagnosis")
    op.drop_column("doctor_exams", "result_text")
    op.drop_column("doctor_exams", "doctor_id")
    op.drop_index("ix_encounters_visit_type_id", table_name="encounters")
    op.drop_column("encounters", "final_result")
    op.drop_column("encounters", "visit_type_id")
    for column_name in (
        "license_date",
        "license_number",
        "ogrn",
        "inn",
        "email",
        "phone",
        "address",
        "legal_name",
    ):
        op.drop_column("centers", column_name)
    op.drop_table("template_phrases")
    op.drop_table("certificate_number_ranges")
    op.drop_table("generated_documents")
    op.drop_table("visit_type_services")
    op.drop_table("visit_types")
