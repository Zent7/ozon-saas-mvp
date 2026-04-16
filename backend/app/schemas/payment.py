from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class PaymentRead(BaseModel):
    id: int
    encounter_id: int
    payment_date: date
    payment_type: str
    amount: Decimal
    status: str
    comment: str | None = None

    model_config = {"from_attributes": True}
