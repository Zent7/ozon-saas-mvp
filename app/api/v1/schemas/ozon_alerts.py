from pydantic import BaseModel


class OzonStockAlertOut(BaseModel):
    offer_id: str
    product_id: int | None
    stock: int
    min_stock: int