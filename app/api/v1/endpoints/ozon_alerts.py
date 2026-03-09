from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.v1.schemas.ozon_alerts import OzonStockAlertOut
from app.models.ozon_stock_threshold import OzonStockThreshold
from app.models.stock_fbo import StockFbo

router = APIRouter()


@router.get(
    "/sellers/{seller_id}/alerts",
    response_model=list[OzonStockAlertOut],
)
def get_ozon_stock_alerts(
    seller_id: UUID,
    db: Session = Depends(get_db),
):
    thresholds = (
        db.query(OzonStockThreshold)
        .filter(OzonStockThreshold.seller_id == seller_id)
        .filter(OzonStockThreshold.enabled == True)
        .all()
    )

    result = []

    for t in thresholds:
        stock = (
            db.query(StockFbo)
            .filter(StockFbo.seller_id == seller_id)
            .filter(StockFbo.offer_id.ilike(t.sku))
            .order_by(StockFbo.as_of.desc())
            .first()
        )

        qty = stock.qty if stock else 0

        if qty <= t.min_stock:
            result.append(
                {
                    "sku": t.sku,
                    "warehouse_id": t.warehouse_id,
                    "stock": qty,
                    "min_stock": t.min_stock,
                }
            )

    return result