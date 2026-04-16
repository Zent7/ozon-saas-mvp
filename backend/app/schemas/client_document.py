from datetime import date

from pydantic import BaseModel


class ClientDocumentRead(BaseModel):
    id: int
    client_id: int
    document_type: str
    series: str | None = None
    number: str | None = None
    issued_by: str | None = None
    issued_at: date | None = None
    notes: str | None = None

    model_config = {"from_attributes": True}
