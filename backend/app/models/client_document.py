from datetime import date

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class ClientDocument(TimestampMixin, Base):
    __tablename__ = "client_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    document_type: Mapped[str] = mapped_column(String(100), index=True)
    series: Mapped[str | None] = mapped_column(String(30), nullable=True)
    number: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True)
    blank_form_id: Mapped[int | None] = mapped_column(ForeignKey("blank_forms.id"), nullable=True, index=True)
    blank_number_snapshot: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    issued_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    issued_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
