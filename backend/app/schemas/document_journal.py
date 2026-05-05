from datetime import date

from pydantic import BaseModel


class DocumentJournalEntryRead(BaseModel):
    id: int
    journal_code: str
    journal_name: str
    generated_document_id: int | None = None
    client_id: int | None = None
    encounter_id: int | None = None
    issued_at: date | None = None
    series: str | None = None
    number: str | None = None
    result_text: str | None = None
    notes: str | None = None
    created_by_user_id: int | None = None

    model_config = {"from_attributes": True}


class SpoiledCertificateBlankRead(BaseModel):
    id: int
    range_id: int | None = None
    visit_type_id: int | None = None
    series: str | None = None
    number: str
    spoiled_at: date | None = None
    reason: str | None = None
    created_by_user_id: int | None = None

    model_config = {"from_attributes": True}
