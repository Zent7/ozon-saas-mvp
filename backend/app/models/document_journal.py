from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class DocumentJournalEntry(TimestampMixin, Base):
    __tablename__ = "document_journal_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    journal_code: Mapped[str] = mapped_column(String(80), index=True)
    journal_name: Mapped[str] = mapped_column(String(255))
    generated_document_id: Mapped[int | None] = mapped_column(ForeignKey("generated_documents.id"), nullable=True, index=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True, index=True)
    encounter_id: Mapped[int | None] = mapped_column(ForeignKey("encounters.id"), nullable=True, index=True)
    issued_at: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    series: Mapped[str | None] = mapped_column(String(40), nullable=True)
    number: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    result_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class SpoiledCertificateBlank(TimestampMixin, Base):
    __tablename__ = "spoiled_certificate_blanks"

    id: Mapped[int] = mapped_column(primary_key=True)
    range_id: Mapped[int | None] = mapped_column(ForeignKey("certificate_number_ranges.id"), nullable=True, index=True)
    visit_type_id: Mapped[int | None] = mapped_column(ForeignKey("visit_types.id"), nullable=True, index=True)
    series: Mapped[str | None] = mapped_column(String(40), nullable=True)
    number: Mapped[str] = mapped_column(String(80), index=True)
    spoiled_at: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
