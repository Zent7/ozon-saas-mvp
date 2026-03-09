from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional


class OzonStockThresholdUpsert(BaseModel):
    sku: str = Field(min_length=1)
    warehouse_id: int
    min_stock: int = Field(ge=0)
    enabled: bool = True
    cooldown_minutes: Optional[int] = Field(default=None, ge=1)


class OzonStockThresholdOut(BaseModel):
    id: UUID
    seller_id: UUID
    sku: str
    warehouse_id: int
    min_stock: int
    enabled: bool
    cooldown_minutes: Optional[int]

    class Config:
        from_attributes = True