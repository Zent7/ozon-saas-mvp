from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.schemas.ozon_stock_threshold import (
    OzonStockThresholdOut,
    OzonThresholdPatch,
    OzonStockThresholdUpsert,
)
from app.crud.crud_ozon_stock_threshold import (
    delete_threshold,
    get_thresholds,
    patch_threshold,
    upsert_threshold,
)

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


@router.get(
    "/sellers/{seller_id}/ozon/thresholds",
    response_model=list[OzonStockThresholdOut],
)
def threshold_list(
    seller_id: UUID,
    db: Session = Depends(get_db),
):
    return get_thresholds(
        db=db,
        seller_id=seller_id,
    )


@router.patch(
    "/sellers/{seller_id}/ozon/thresholds/{threshold_id}",
    response_model=OzonStockThresholdOut,
)
def threshold_patch(
    seller_id: UUID,
    threshold_id: UUID,
    payload: OzonThresholdPatch,
    db: Session = Depends(get_db),
):
    obj = patch_threshold(
        db=db,
        seller_id=seller_id,
        threshold_id=threshold_id,
        min_stock=payload.min_stock,
        enabled=payload.enabled,
        cooldown_minutes=payload.cooldown_minutes,
    )
    if obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Threshold not found",
        )
    return obj


@router.delete(
    "/sellers/{seller_id}/ozon/thresholds/{threshold_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def threshold_delete(
    seller_id: UUID,
    threshold_id: UUID,
    db: Session = Depends(get_db),
):
    deleted = delete_threshold(
        db=db,
        seller_id=seller_id,
        threshold_id=threshold_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Threshold not found",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)