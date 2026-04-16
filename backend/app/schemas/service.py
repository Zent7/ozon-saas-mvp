from decimal import Decimal

from pydantic import BaseModel


class ServiceRead(BaseModel):
    id: int
    code: str
    name: str
    price: Decimal
    is_active: bool

    model_config = {"from_attributes": True}
