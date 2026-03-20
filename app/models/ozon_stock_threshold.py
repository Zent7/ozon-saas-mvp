import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.db.base_class import Base


class OzonStockThreshold(Base):
    __tablename__ = "ozon_stock_thresholds"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    seller_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sellers.id"),
        nullable=False,
        index=True,
    )
    offer_id = Column(Text, nullable=False)

    min_stock = Column(Integer, nullable=False)
    enabled = Column(Boolean, nullable=False, default=True)

    cooldown_minutes = Column(Integer, nullable=True)
    last_alert_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("seller_id", "offer_id", name="uq_ozon_stock_threshold"),
        CheckConstraint("min_stock >= 0", name="ck_ozon_stock_threshold_min_stock_nonneg"),
    )