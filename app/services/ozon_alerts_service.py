from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.models.ozon_product import OzonProduct
from app.models.ozon_stock_threshold import OzonStockThreshold
from app.models.stock_fbo import StockFbo


def build_stock_alerts_for_seller(db: Session, seller_id: UUID) -> list[dict]:
    thresholds = (
        db.query(OzonStockThreshold)
        .filter(OzonStockThreshold.seller_id == seller_id)
        .filter(OzonStockThreshold.enabled.is_(True))
        .all()
    )

    if not thresholds:
        return []

    offer_ids = [t.offer_id for t in thresholds if t.offer_id]

    if not offer_ids:
        return []

    latest_stock_subquery = (
        db.query(
            StockFbo.offer_id.label("offer_id"),
            func.max(StockFbo.as_of).label("max_as_of"),
        )
        .filter(StockFbo.seller_id == seller_id)
        .filter(StockFbo.offer_id.in_(offer_ids))
        .group_by(StockFbo.offer_id)
        .subquery()
    )

    latest_stocks = (
        db.query(StockFbo)
        .join(
            latest_stock_subquery,
            and_(
                StockFbo.offer_id == latest_stock_subquery.c.offer_id,
                StockFbo.as_of == latest_stock_subquery.c.max_as_of,
            ),
        )
        .filter(StockFbo.seller_id == seller_id)
        .all()
    )

    stock_by_offer_id = {stock.offer_id: stock.qty for stock in latest_stocks}

    products = (
        db.query(OzonProduct)
        .filter(OzonProduct.seller_id == seller_id)
        .filter(OzonProduct.offer_id.in_(offer_ids))
        .all()
    )

    product_id_by_offer_id = {
        product.offer_id: product.product_id for product in products
    }

    result = []

    for threshold in thresholds:
        qty = stock_by_offer_id.get(threshold.offer_id, 0)

        if qty <= threshold.min_stock:
            result.append(
                {
                    "offer_id": threshold.offer_id,
                    "product_id": product_id_by_offer_id.get(threshold.offer_id),
                    "stock": qty,
                    "min_stock": threshold.min_stock,
                }
            )

    result.sort(key=lambda x: (x["stock"], x["offer_id"]))

    return result