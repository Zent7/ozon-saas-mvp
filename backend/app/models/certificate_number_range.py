from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class CertificateNumberRange(TimestampMixin, Base):
    __tablename__ = "certificate_number_ranges"

    id: Mapped[int] = mapped_column(primary_key=True)
    visit_type_id: Mapped[int | None] = mapped_column(ForeignKey("visit_types.id"), nullable=True, index=True)
    service_id: Mapped[int | None] = mapped_column(ForeignKey("services.id"), nullable=True, index=True)
    series: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    number_from: Mapped[int] = mapped_column(Integer)
    number_to: Mapped[int] = mapped_column(Integer)
    current_number: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
