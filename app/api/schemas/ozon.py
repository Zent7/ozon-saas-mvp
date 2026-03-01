from uuid import UUID
from pydantic import BaseModel, Field


class OzonConnectIn(BaseModel):
    seller_id: UUID
    client_id: str = Field(..., min_length=3)
    api_key: str = Field(..., min_length=10)


class OzonConnectOut(BaseModel):
    connection_id: int
    is_active: bool