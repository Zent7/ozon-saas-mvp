from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class DoctorExam(TimestampMixin, Base):
    __tablename__ = "doctor_exams"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), index=True)
    encounter_id: Mapped[int | None] = mapped_column(ForeignKey("encounters.id"), nullable=True, index=True)
    doctor_role_id: Mapped[str] = mapped_column(String(80), index=True)
    doctor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fields_json: Mapped[dict] = mapped_column(JSON, default=dict)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
