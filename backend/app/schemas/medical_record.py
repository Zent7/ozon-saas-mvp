from datetime import date

from pydantic import BaseModel


class MedicalRecordBase(BaseModel):
    client_id: int
    center_id: int | None = None
    card_number: str | None = None
    opened_at: date | None = None
    insurance_org: str | None = None
    oms_policy: str | None = None
    marital_status: str | None = None
    education: str | None = None
    employment_status: str | None = None
    work_place: str | None = None
    position: str | None = None
    disability: str | None = None
    blood_group: str | None = None
    rh_factor: str | None = None
    allergies: str | None = None
    dispensary_observation: str | None = None
    health_group: str | None = None
    diagnosis: str | None = None
    mkb10: str | None = None
    notes: str | None = None


class MedicalRecordCreate(MedicalRecordBase):
    pass


class MedicalRecordUpdate(MedicalRecordBase):
    pass


class MedicalRecordRead(BaseModel):
    id: int
    client_id: int
    center_id: int | None = None
    card_number: str | None = None
    opened_at: date | None = None
    insurance_org: str | None = None
    oms_policy: str | None = None
    marital_status: str | None = None
    education: str | None = None
    employment_status: str | None = None
    work_place: str | None = None
    position: str | None = None
    disability: str | None = None
    blood_group: str | None = None
    rh_factor: str | None = None
    allergies: str | None = None
    dispensary_observation: str | None = None
    health_group: str | None = None
    diagnosis: str | None = None
    mkb10: str | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}


class MedicalRecordEntryBase(BaseModel):
    medical_record_id: int
    encounter_id: int | None = None
    doctor_exam_id: int | None = None
    entry_date: date | None = None
    doctor_role_id: str | None = None
    doctor_name: str | None = None
    complaints: str | None = None
    anamnesis: str | None = None
    objective_data: str | None = None
    diagnosis: str | None = None
    mkb10: str | None = None
    recommendations: str | None = None
    conclusion: str | None = None


class MedicalRecordEntryCreate(MedicalRecordEntryBase):
    pass


class MedicalRecordEntryUpdate(MedicalRecordEntryBase):
    pass


class MedicalRecordEntryRead(BaseModel):
    id: int
    medical_record_id: int
    encounter_id: int | None = None
    doctor_exam_id: int | None = None
    entry_date: date | None = None
    doctor_role_id: str | None = None
    doctor_name: str | None = None
    complaints: str | None = None
    anamnesis: str | None = None
    objective_data: str | None = None
    diagnosis: str | None = None
    mkb10: str | None = None
    recommendations: str | None = None
    conclusion: str | None = None

    model_config = {"from_attributes": True}
