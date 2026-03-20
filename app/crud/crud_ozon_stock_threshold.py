from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.orm import Session

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


def get_thresholds(
    db: Session,
    *,
    seller_id: UUID,
) -> list[OzonStockThreshold]:
    return (
        db.query(OzonStockThreshold)
        .filter(OzonStockThreshold.seller_id == seller_id)
        .order_by(OzonStockThreshold.created_at.desc())
        .all()
    )


def get_threshold_by_id(
    db: Session,
    *,
    seller_id: UUID,
    threshold_id: UUID,
) -> OzonStockThreshold | None:
    return (
        db.query(OzonStockThreshold)
        .filter(
            OzonStockThreshold.id == threshold_id,
            OzonStockThreshold.seller_id == seller_id,
        )
        .one_or_none()
    )


def patch_threshold(
    db: Session,
    *,
    seller_id: UUID,
    threshold_id: UUID,
    min_stock: int | None = None,
    enabled: bool | None = None,
    cooldown_minutes: int | None = None,
) -> OzonStockThreshold | None:
    obj = get_threshold_by_id(
        db,
        seller_id=seller_id,
        threshold_id=threshold_id,
    )
    if obj is None:
        return None

    if min_stock is not None:
        obj.min_stock = min_stock

    if enabled is not None:
        obj.enabled = enabled

    if cooldown_minutes is not None:
        obj.cooldown_minutes = cooldown_minutes

    db.commit()
    db.refresh(obj)
    return obj


def delete_threshold(
    db: Session,
    *,
    seller_id: UUID,
    threshold_id: UUID,
) -> bool:
    obj = get_threshold_by_id(
        db,
        seller_id=seller_id,
        threshold_id=threshold_id,
    )
    if obj is None:
        return False

    db.delete(obj)
    db.commit()
    return True


def mark_threshold_alert_sent(
    db: Session,
    *,
    threshold_id: UUID,
) -> OzonStockThreshold | None:
    obj = (
        db.query(OzonStockThreshold)
        .filter(OzonStockThreshold.id == threshold_id)
        .one_or_none()
    )
    if obj is None:
        return None

    obj.last_alert_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(obj)
    return obj