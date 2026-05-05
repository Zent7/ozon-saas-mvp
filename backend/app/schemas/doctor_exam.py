from datetime import datetime

from pydantic import BaseModel, Field


class DoctorExamBase(BaseModel):
    client_id: int
    encounter_id: int | None = None
    doctor_role_id: str
    doctor_id: int | None = None
    doctor_name: str | None = None
    result_text: str | None = None
    diagnosis: str | None = None
    comment: str | None = None
    fields_json: dict = Field(default_factory=dict)
    is_completed: bool = False
    completed_at: datetime | None = None


class DoctorExamCreate(DoctorExamBase):
    pass


class DoctorExamUpdate(BaseModel):
    encounter_id: int | None = None
    doctor_id: int | None = None
    doctor_name: str | None = None
    result_text: str | None = None
    diagnosis: str | None = None
    comment: str | None = None
    fields_json: dict | None = None
    is_completed: bool | None = None
    completed_at: datetime | None = None


class DoctorExamRead(DoctorExamBase):
    id: int

    model_config = {"from_attributes": True}
