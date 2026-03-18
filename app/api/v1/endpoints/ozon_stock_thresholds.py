from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.schemas.ozon_stock_threshold import (
    OzonStockThresholdOut,
    OzonStockThresholdUpsert,
)
from app.crud.crud_ozon_stock_threshold import upsert_threshold

router = APIRouter()


@router.post(
    "/sellers/{seller_id}/ozon/thresholds:upsert",
    response_model=OzonStockThresholdOut,
)
def threshold_upsert(
    seller_id: UUID,
    payload: OzonStockThresholdUpsert,
    db: Session = Depends(get_db),
):
    return upsert_threshold(
        db=db,
        seller_id=seller_id,
        offer_id=payload.offer_id,
        min_stock=payload.min_stock,
        enabled=payload.enabled,
        cooldown_minutes=payload.cooldown_minutes,
    )