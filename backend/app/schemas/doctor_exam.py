from pydantic import BaseModel, Field


class DoctorExamBase(BaseModel):
    client_id: int
    encounter_id: int | None = None
    doctor_role_id: str
    doctor_name: str | None = None
    fields_json: dict = Field(default_factory=dict)
    is_completed: bool = False


class DoctorExamCreate(DoctorExamBase):
    pass


class DoctorExamUpdate(BaseModel):
    encounter_id: int | None = None
    doctor_name: str | None = None
    fields_json: dict | None = None
    is_completed: bool | None = None


class DoctorExamRead(DoctorExamBase):
    id: int

    model_config = {"from_attributes": True}
