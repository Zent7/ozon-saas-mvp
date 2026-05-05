from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class EncounterBase(BaseModel):
    center_id: int
    client_id: int
    visit_type_id: int | None = None
    encounter_date: date
    payment_type: str
    total_amount: Decimal = Decimal("0.00")
    final_result: str | None = None
    comment: str | None = None


class EncounterCreate(EncounterBase):
    pass


class EncounterUpdate(BaseModel):
    visit_type_id: int | None = None
    encounter_date: date | None = None
    payment_type: str | None = None
    total_amount: Decimal | None = None
    final_result: str | None = None
    comment: str | None = None
    status: str | None = None


class EncounterRead(EncounterBase):
    id: int
    status: str

    model_config = {"from_attributes": True}
