import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base_class import Base


class OzonConnectionType(str, enum.Enum):
    API_KEY = "api_key"
    OAUTH = "oauth"


class OzonConnection(Base):
    __tablename__ = "ozon_connections"

    id = Column(Integer, primary_key=True)

    seller_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sellers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    seller = relationship("Seller", backref="ozon_connections")

    type = Column(Enum(OzonConnectionType, name="ozon_connection_type"), nullable=False)

    client_id = Column(String(64), nullable=False)

    api_key_enc = Column(Text, nullable=True)
    access_token_enc = Column(Text, nullable=True)
    refresh_token_enc = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)