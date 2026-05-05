from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class MedicalRecord(TimestampMixin, Base):
    __tablename__ = "medical_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), unique=True, index=True)
    center_id: Mapped[int | None] = mapped_column(ForeignKey("centers.id"), nullable=True, index=True)
    card_number: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    opened_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    insurance_org: Mapped[str | None] = mapped_column(String(255), nullable=True)
    oms_policy: Mapped[str | None] = mapped_column(String(80), nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(120), nullable=True)
    education: Mapped[str | None] = mapped_column(String(120), nullable=True)
    employment_status: Mapped[str | None] = mapped_column(String(120), nullable=True)
    work_place: Mapped[str | None] = mapped_column(String(255), nullable=True)
    position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    disability: Mapped[str | None] = mapped_column(String(255), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(40), nullable=True)
    rh_factor: Mapped[str | None] = mapped_column(String(40), nullable=True)
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    dispensary_observation: Mapped[str | None] = mapped_column(Text, nullable=True)
    health_group: Mapped[str | None] = mapped_column(String(120), nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    mkb10: Mapped[str | None] = mapped_column(String(80), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MedicalRecordEntry(TimestampMixin, Base):
    __tablename__ = "medical_record_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    medical_record_id: Mapped[int] = mapped_column(ForeignKey("medical_records.id"), index=True)
    encounter_id: Mapped[int | None] = mapped_column(ForeignKey("encounters.id"), nullable=True, index=True)
    doctor_exam_id: Mapped[int | None] = mapped_column(ForeignKey("doctor_exams.id"), nullable=True, index=True)
    entry_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    doctor_role_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)
    doctor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    complaints: Mapped[str | None] = mapped_column(Text, nullable=True)
    anamnesis: Mapped[str | None] = mapped_column(Text, nullable=True)
    objective_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    mkb10: Mapped[str | None] = mapped_column(String(80), nullable=True)
    recommendations: Mapped[str | None] = mapped_column(Text, nullable=True)
    conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)
