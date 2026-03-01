import uuid
from sqlalchemy import DateTime, ForeignKey, Integer, String, func, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base


class StockFbo(Base):
    __tablename__ = "stocks_fbo"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seller_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sellers.id"), index=True)

    offer_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    cluster: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)

    as_of: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        Index("ix_stocks_fbo_seller_offer_asof", "seller_id", "offer_id", "as_of"),
    )