from datetime import date

from pydantic import BaseModel


class ClientBase(BaseModel):
    last_name: str
    first_name: str
    middle_name: str | None = None
    birth_date: date
    sex: str | None = None
    phone: str | None = None
    snils: str | None = None
    oms_policy: str | None = None
    address_text: str | None = None
    notes: str | None = None


class ClientCreate(ClientBase):
    pass


class ClientRead(ClientBase):
    id: int

    model_config = {"from_attributes": True}
