from pydantic import BaseModel


class DoctorRoleRead(BaseModel):
    id: int
    code: str
    name: str
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}
