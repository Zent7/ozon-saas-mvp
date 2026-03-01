from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean, BigInteger, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base


class OzonProduct(Base):
    __tablename__ = "ozon_products"

    id = Column(Integer, primary_key=True, index=True)

    seller_id = Column(UUID(as_uuid=True), ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False, index=True)

    # ❗️ ВАЖНО: product_id теперь BigInteger
    product_id = Column(BigInteger, nullable=False, index=True)  # Ozon product_id
    offer_id = Column(String, nullable=False)                     # Ozon offer_id

    has_fbo_stocks = Column(Boolean, nullable=False, default=False)
    has_fbs_stocks = Column(Boolean, nullable=False, default=False)
    archived = Column(Boolean, nullable=False, default=False)
    is_discounted = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("seller_id", "product_id", name="uq_ozon_products_seller_product"),
    )