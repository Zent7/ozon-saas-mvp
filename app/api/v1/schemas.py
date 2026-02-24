import uuid
from pydantic import BaseModel


class SellerCreate(BaseModel):
    name: str


class SellerRead(BaseModel):
    id: uuid.UUID
    name: str

    class Config:
        from_attributes = True  # SQLAlchemy support (Pydantic v2)