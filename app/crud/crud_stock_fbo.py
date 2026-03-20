from uuid import UUID

from sqlalchemy.orm import Session

from app.models.stock_fbo import StockFbo


def get_latest_stock_fbo(
    db: Session,
    *,
    seller_id: UUID,
    offer_id: str,
) -> StockFbo | None:
    return (
        db.query(StockFbo)
        .filter(
            StockFbo.seller_id == seller_id,
            StockFbo.offer_id == offer_id,
        )
        .order_by(StockFbo.as_of.desc())
        .first()
    )