from sqlalchemy.orm import Session

from app.models.ozon_stock_threshold import OzonStockThreshold
from app.models.stock_fbo import StockFbo


def build_stock_alerts_for_seller(db: Session, seller_id):
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