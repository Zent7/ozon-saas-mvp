from decimal import Decimal

from pydantic import BaseModel


class ServiceRead(BaseModel):
    id: int
    legacy_source_id: int | None = None
    category_id: int | None = None
    code: str
    name: str
    price: Decimal
    is_active: bool
    requires_sequence: bool = False
    recall_after_days: int | None = None

    model_config = {"from_attributes": True}
