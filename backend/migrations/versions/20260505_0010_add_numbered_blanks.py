"""Add numbered blanks tables and link generated/client documents.

Revision ID: 20260505_0010
Revises: 20260430_0009
Create Date: 2026-05-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op


revision: str = "20260505_0010"
down_revision: str | None = "20260430_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


DRIVER_BLANK_TYPE_CODE = "driver_medical_certificate"
DRIVER_BLANK_TYPE_NAME = "Медицинское заключение для водительского удостоверения"


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if not inspector.has_table("blank_types"):
        op.create_table(
            "blank_types",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("code", sa.String(length=80), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.UniqueConstraint("code", name="uq_blank_types_code"),
        )
        op.create_index("ix_blank_types_code", "blank_types", ["code"], unique=False)

        op.execute(
            sa.text(
                "INSERT INTO blank_types (code, name, is_active) "
                "VALUES (:code, :name, true)"
            ).bindparams(code=DRIVER_BLANK_TYPE_CODE, name=DRIVER_BLANK_TYPE_NAME)
        )

    if not inspector.has_table("blank_batches"):
        op.create_table(
            "blank_batches",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("center_id", sa.Integer(), nullable=True),
            sa.Column("blank_type", sa.String(length=80), nullable=False),
            sa.Column("series", sa.String(length=40), nullable=True),
            sa.Column("number_from", sa.Integer(), nullable=False),
            sa.Column("number_to", sa.Integer(), nullable=False),
            sa.Column("number_width", sa.Integer(), nullable=False, server_default=sa.text("6")),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("received_at", sa.Date(), nullable=True),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["center_id"], ["centers.id"]),
            sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        )
        op.create_index("ix_blank_batches_center_id", "blank_batches", ["center_id"])
        op.create_index("ix_blank_batches_blank_type", "blank_batches", ["blank_type"])
        op.create_index("ix_blank_batches_series", "blank_batches", ["series"])

    if not inspector.has_table("blank_forms"):
        op.create_table(
            "blank_forms",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("batch_id", sa.Integer(), nullable=False),
            sa.Column("center_id", sa.Integer(), nullable=True),
            sa.Column("blank_type", sa.String(length=80), nullable=False),
            sa.Column("series", sa.String(length=40), nullable=True),
            sa.Column("number_value", sa.Integer(), nullable=False),
            sa.Column("full_number", sa.String(length=80), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default=sa.text("'free'")),
            sa.Column("client_id", sa.Integer(), nullable=True),
            sa.Column("encounter_id", sa.Integer(), nullable=True),
            sa.Column("client_document_id", sa.Integer(), nullable=True),
            sa.Column("generated_document_id", sa.Integer(), nullable=True),
            sa.Column("issued_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("issued_by_user_id", sa.Integer(), nullable=True),
            sa.Column("spoiled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("spoiled_by_user_id", sa.Integer(), nullable=True),
            sa.Column("spoiled_reason", sa.Text(), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cancelled_by_user_id", sa.Integer(), nullable=True),
            sa.Column("cancelled_reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
            sa.ForeignKeyConstraint(["batch_id"], ["blank_batches.id"]),
            sa.ForeignKeyConstraint(["center_id"], ["centers.id"]),
            sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
            sa.ForeignKeyConstraint(["encounter_id"], ["encounters.id"]),
            sa.ForeignKeyConstraint(["client_document_id"], ["client_documents.id"]),
            sa.ForeignKeyConstraint(["generated_document_id"], ["generated_documents.id"]),
            sa.ForeignKeyConstraint(["issued_by_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["spoiled_by_user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["cancelled_by_user_id"], ["users.id"]),
            sa.UniqueConstraint(
                "center_id", "blank_type", "full_number", name="uq_blank_forms_center_type_number"
            ),
        )
        op.create_index("ix_blank_forms_batch_id", "blank_forms", ["batch_id"])
        op.create_index("ix_blank_forms_blank_type", "blank_forms", ["blank_type"])
        op.create_index("ix_blank_forms_status", "blank_forms", ["status"])
        op.create_index("ix_blank_forms_full_number", "blank_forms", ["full_number"])
        op.create_index("ix_blank_forms_client_id", "blank_forms", ["client_id"])
        op.create_index("ix_blank_forms_encounter_id", "blank_forms", ["encounter_id"])
        op.create_index(
            "ix_blank_forms_pick",
            "blank_forms",
            ["blank_type", "center_id", "status", "number_value"],
        )

    # Привязки к документам
    gen_columns = {col["name"] for col in inspector.get_columns("generated_documents")}
    if "blank_form_id" not in gen_columns:
        op.add_column(
            "generated_documents",
            sa.Column("blank_form_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_generated_documents_blank_form_id",
            "generated_documents",
            "blank_forms",
            ["blank_form_id"],
            ["id"],
        )
        op.create_index(
            "ix_generated_documents_blank_form_id",
            "generated_documents",
            ["blank_form_id"],
        )
    if "blank_number_snapshot" not in gen_columns:
        op.add_column(
            "generated_documents",
            sa.Column("blank_number_snapshot", sa.String(length=80), nullable=True),
        )
        op.create_index(
            "ix_generated_documents_blank_number_snapshot",
            "generated_documents",
            ["blank_number_snapshot"],
        )
    if "cancelled_at" not in gen_columns:
        op.add_column(
            "generated_documents",
            sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        )
    if "cancelled_by_user_id" not in gen_columns:
        op.add_column(
            "generated_documents",
            sa.Column("cancelled_by_user_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_generated_documents_cancelled_by_user_id",
            "generated_documents",
            "users",
            ["cancelled_by_user_id"],
            ["id"],
        )
    if "cancelled_reason" not in gen_columns:
        op.add_column(
            "generated_documents",
            sa.Column("cancelled_reason", sa.String(length=500), nullable=True),
        )

    cd_columns = {col["name"] for col in inspector.get_columns("client_documents")}
    if "blank_form_id" not in cd_columns:
        op.add_column(
            "client_documents",
            sa.Column("blank_form_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_client_documents_blank_form_id",
            "client_documents",
            "blank_forms",
            ["blank_form_id"],
            ["id"],
        )
        op.create_index(
            "ix_client_documents_blank_form_id",
            "client_documents",
            ["blank_form_id"],
        )
    if "blank_number_snapshot" not in cd_columns:
        op.add_column(
            "client_documents",
            sa.Column("blank_number_snapshot", sa.String(length=80), nullable=True),
        )
        op.create_index(
            "ix_client_documents_blank_number_snapshot",
            "client_documents",
            ["blank_number_snapshot"],
        )


def downgrade() -> None:
    op.drop_index("ix_client_documents_blank_number_snapshot", table_name="client_documents")
    op.drop_index("ix_client_documents_blank_form_id", table_name="client_documents")
    op.drop_constraint("fk_client_documents_blank_form_id", "client_documents", type_="foreignkey")
    op.drop_column("client_documents", "blank_number_snapshot")
    op.drop_column("client_documents", "blank_form_id")

    op.drop_index("ix_generated_documents_blank_number_snapshot", table_name="generated_documents")
    op.drop_index("ix_generated_documents_blank_form_id", table_name="generated_documents")
    op.drop_constraint(
        "fk_generated_documents_cancelled_by_user_id", "generated_documents", type_="foreignkey"
    )
    op.drop_constraint("fk_generated_documents_blank_form_id", "generated_documents", type_="foreignkey")
    op.drop_column("generated_documents", "cancelled_reason")
    op.drop_column("generated_documents", "cancelled_by_user_id")
    op.drop_column("generated_documents", "cancelled_at")
    op.drop_column("generated_documents", "blank_number_snapshot")
    op.drop_column("generated_documents", "blank_form_id")

    op.drop_index("ix_blank_forms_pick", table_name="blank_forms")
    op.drop_index("ix_blank_forms_encounter_id", table_name="blank_forms")
    op.drop_index("ix_blank_forms_client_id", table_name="blank_forms")
    op.drop_index("ix_blank_forms_full_number", table_name="blank_forms")
    op.drop_index("ix_blank_forms_status", table_name="blank_forms")
    op.drop_index("ix_blank_forms_blank_type", table_name="blank_forms")
    op.drop_index("ix_blank_forms_batch_id", table_name="blank_forms")
    op.drop_table("blank_forms")

    op.drop_index("ix_blank_batches_series", table_name="blank_batches")
    op.drop_index("ix_blank_batches_blank_type", table_name="blank_batches")
    op.drop_index("ix_blank_batches_center_id", table_name="blank_batches")
    op.drop_table("blank_batches")

    op.drop_index("ix_blank_types_code", table_name="blank_types")
    op.drop_table("blank_types")
