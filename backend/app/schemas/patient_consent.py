from datetime import date

from pydantic import BaseModel


class PatientConsentRead(BaseModel):
    id: int
    client_id: int
    encounter_id: int | None = None
    template_id: int | None = None
    consent_type: str
    title: str
    signed_at: date | None = None
    representative_name: str | None = None
    file_path: str | None = None
    notes: str | None = None
    created_by_user_id: int | None = None

    model_config = {"from_attributes": True}
