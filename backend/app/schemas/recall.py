from datetime import date

from pydantic import BaseModel


class RecallRead(BaseModel):
    id: int
    client_id: int
    encounter_id: int | None
    service_id: int | None
    planned_date: date
    status: str
    comment: str | None

    model_config = {"from_attributes": True}
