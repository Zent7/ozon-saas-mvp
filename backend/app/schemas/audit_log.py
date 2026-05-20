from datetime import datetime

from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: int
    user_id: int | None = None
    user_name: str | None = None
    entity_type: str
    entity_id: int
    action: str
    center_id: int | None = None
    payload_json: dict | None = None
    created_at: datetime
