from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TimestampMixin


class VisitType(TimestampMixin, Base):
    __tablename__ = "visit_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class VisitTypeService(Base):
    __tablename__ = "visit_type_services"

    id: Mapped[int] = mapped_column(primary_key=True)
    visit_type_id: Mapped[int] = mapped_column(ForeignKey("visit_types.id"), index=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id"), index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=100)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
