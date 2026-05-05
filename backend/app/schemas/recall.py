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


class RecallDueRead(BaseModel):
    client_id: int
    patient_number: int | None = None
    full_name: str
    phone: str | None = None
    encounter_id: int
    encounter_date: date
    service_id: int
    service_name: str
    service_category_id: int | None = None
    service_category_name: str | None = None
    recall_after_days: int
    planned_date: date
    days_left: int
    status: str
    comment: str | None = None
    recall_id: int | None = None


class RecallMark(BaseModel):
    client_id: int
    encounter_id: int | None = None
    service_id: int | None = None
    planned_date: date
    status: str
    comment: str | None = None
