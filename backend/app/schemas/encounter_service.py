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
