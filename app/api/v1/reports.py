from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.sale import Sale

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/profit-by-offer")
def profit_by_offer(
    seller_id: UUID = Query(...),
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db),
):
    stmt = (
        select(
            Sale.offer_id.label("offer_id"),
            func.sum(Sale.qty).label("qty"),
            func.sum(Sale.revenue).label("revenue"),
            func.sum(Sale.commission + Sale.logistics).label("fees"),
            (func.sum(Sale.revenue) - func.sum(Sale.commission + Sale.logistics)).label("profit"),
        )
        .where(Sale.seller_id == seller_id)
        .where(Sale.date >= date_from)
        .where(Sale.date <= date_to)
        .group_by(Sale.offer_id)
        .order_by(func.sum(Sale.revenue).desc())
    )

    rows = db.execute(stmt).mappings().all()

    items = []
    for r in rows:
        items.append(
            {
                "offer_id": r["offer_id"],
                "qty": r["qty"],
                "revenue": str(r["revenue"]),
                "fees": str(r["fees"]),
                "profit": str(r["profit"]),
            }
        )

    return {
        "seller_id": str(seller_id),
        "date_from": str(date_from),
        "date_to": str(date_to),
        "items": items,
    }