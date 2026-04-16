from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class EncounterBase(BaseModel):
    center_id: int
    client_id: int
    encounter_date: date
    payment_type: str
    total_amount: Decimal = Decimal("0.00")
    comment: str | None = None


class EncounterCreate(EncounterBase):
    pass


class EncounterRead(EncounterBase):
    id: int
    status: str

    model_config = {"from_attributes": True}
