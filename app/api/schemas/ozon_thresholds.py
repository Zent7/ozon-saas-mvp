from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class OzonStockThresholdUpsert(BaseModel):
    offer_id: str = Field(min_length=1)
    min_stock: int = Field(ge=0)
    enabled: bool = True
    cooldown_minutes: Optional[int] = Field(default=None, ge=1)


class OzonThresholdPatch(BaseModel):
    min_stock: int | None = Field(default=None, ge=0)
    enabled: bool | None = None
    cooldown_minutes: int | None = Field(default=None, ge=1)


class OzonStockThresholdOut(BaseModel):
    id: UUID
    seller_id: UUID
    offer_id: str
    min_stock: int
    enabled: bool
    cooldown_minutes: Optional[int] = None
    last_alert_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True