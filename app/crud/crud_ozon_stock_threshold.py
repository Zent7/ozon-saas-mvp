from sqlalchemy.orm import Session
from uuid import UUID

from app.models.ozon_stock_threshold import OzonStockThreshold


def upsert_threshold(
    db: Session,
    *,
    seller_id: UUID,
    sku: str,
    warehouse_id: int,
    min_stock: int,
    enabled: bool,
    cooldown_minutes: int | None,
) -> OzonStockThreshold:
    obj = (
        db.query(OzonStockThreshold)
        .filter(
            OzonStockThreshold.seller_id == seller_id,
            OzonStockThreshold.sku == sku,
            OzonStockThreshold.warehouse_id == warehouse_id,
        )
        .one_or_none()
    )

    if obj is None:
        obj = OzonStockThreshold(
            seller_id=seller_id,
            sku=sku,
            warehouse_id=warehouse_id,
            min_stock=min_stock,
            enabled=enabled,
            cooldown_minutes=cooldown_minutes,
        )
        db.add(obj)
    else:
        obj.min_stock = min_stock
        obj.enabled = enabled
        obj.cooldown_minutes = cooldown_minutes

    db.commit()
    db.refresh(obj)
    return obj