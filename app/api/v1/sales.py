from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.sale import Sale

router = APIRouter(prefix="/sales", tags=["sales"])


class SaleCreate(BaseModel):
    seller_id: UUID
    posting_number: str = Field(..., max_length=64)
    offer_id: str = Field(..., max_length=128)
    date: date
    qty: int = Field(..., ge=1)
    revenue: Decimal
    commission: Decimal = Decimal("0")
    logistics: Decimal = Decimal("0")


@router.post("/", response_model=dict)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db)):
    sale = Sale(
        seller_id=payload.seller_id,
        posting_number=payload.posting_number,
        offer_id=payload.offer_id,
        date=payload.date,
        qty=payload.qty,
        revenue=payload.revenue,
        commission=payload.commission,
        logistics=payload.logistics,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return {"id": str(sale.id)}