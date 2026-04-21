from decimal import Decimal

from pydantic import BaseModel


class EncounterServiceRead(BaseModel):
    id: int
    encounter_id: int
    service_id: int
    quantity: int
    unit_price: Decimal
    line_total: Decimal
    sequence_number: str | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}


class EncounterServiceCreate(BaseModel):
    encounter_id: int
    service_id: int
    quantity: int = 1
    unit_price: Decimal = Decimal("0.00")
    line_total: Decimal = Decimal("0.00")
    sequence_number: str | None = None
    notes: str | None = None
