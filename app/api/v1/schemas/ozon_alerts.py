from uuid import UUID

from pydantic import BaseModel


class OzonStockAlertOut(BaseModel):
    threshold_id: UUID
    offer_id: str
    product_id: int | None
    stock: int
    min_stock: int