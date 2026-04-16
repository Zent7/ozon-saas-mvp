from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.payment import Payment
from app.schemas.payment import PaymentRead

router = APIRouter()


@router.get("", response_model=list[PaymentRead])
def list_payments(
    encounter_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[PaymentRead]:
    query = select(Payment).order_by(Payment.payment_date.desc(), Payment.id.desc())
    if encounter_id is not None:
        query = query.where(Payment.encounter_id == encounter_id)
    items = db.execute(query).scalars().all()
    return [PaymentRead.model_validate(item) for item in items]
