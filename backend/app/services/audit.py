from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def write_audit_log(
    db: Session,
    *,
    entity_type: str,
    entity_id: int,
    action: str,
    user_id: int | None = None,
    center_id: int | None = None,
    payload_json: dict | None = None,
) -> None:
    log = AuditLog(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        center_id=center_id,
        payload_json=payload_json,
    )
    db.add(log)
