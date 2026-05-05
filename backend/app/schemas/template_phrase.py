from pydantic import BaseModel


class TemplatePhraseCreate(BaseModel):
    doctor_role_id: int | None = None
    service_id: int | None = None
    code: str
    name: str
    text: str
    gender: str | None = None
    is_default: bool = False
    is_active: bool = True


class TemplatePhraseRead(BaseModel):
    id: int
    doctor_role_id: int | None = None
    service_id: int | None = None
    code: str
    name: str
    text: str
    gender: str | None = None
    is_default: bool
    is_active: bool

    model_config = {"from_attributes": True}
