from pydantic import BaseModel


class VisitTypeRead(BaseModel):
    id: int
    code: str
    name: str
    description: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class VisitTypeServiceRead(BaseModel):
    id: int
    visit_type_id: int
    service_id: int
    sort_order: int
    is_required: bool

    model_config = {"from_attributes": True}
