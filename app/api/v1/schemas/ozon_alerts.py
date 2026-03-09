from pydantic import BaseModel


class OzonStockAlertOut(BaseModel):
    sku: str
    warehouse_id: int
    stock: int
    min_stock: int