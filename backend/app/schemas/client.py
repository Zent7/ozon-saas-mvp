from datetime import date

from pydantic import BaseModel


class ClientBase(BaseModel):
    last_name: str
    first_name: str
    middle_name: str | None = None
    birth_date: date
    sex: str | None = None
    phone: str | None = None
    email: str | None = None
    document_type: str | None = None
    document_series: str | None = None
    document_number: str | None = None
    document_issued_by: str | None = None
    document_issued_date: date | None = None
    snils: str | None = None
    oms_policy: str | None = None
    address_text: str | None = None
    notes: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(ClientBase):
    pass


class ClientRead(ClientBase):
    id: int
    patient_number: int

    model_config = {"from_attributes": True}
