from sqlalchemy.orm import Session
from uuid import UUID

from app.models.ozon_stock_threshold import OzonStockThreshold


def upsert_threshold(
    db: Session,
    *,
    seller_id: UUID,
    offer_id: str,
    min_stock: int,
    enabled: bool,
    cooldown_minutes: int | None,
) -> OzonStockThreshold:
    obj = (
        db.query(OzonStockThreshold)
        .filter(
            OzonStockThreshold.seller_id == seller_id,
            OzonStockThreshold.offer_id == offer_id,
        )
        .one_or_none()
    )

    if obj is None:
        obj = OzonStockThreshold(
            seller_id=seller_id,
            offer_id=offer_id,
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