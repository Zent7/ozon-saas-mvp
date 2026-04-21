from app.schemas.client import ClientCreate, ClientUpdate


def build_duplicate_check_keys(payload: ClientCreate | ClientUpdate) -> dict[str, str]:
    keys: dict[str, str] = {}
    if payload.phone:
        keys["phone"] = payload.phone
    if payload.document_series or payload.document_number:
        keys["document"] = " ".join(
            item for item in [payload.document_series, payload.document_number] if item
        )
    if payload.snils:
        keys["snils"] = payload.snils
    if payload.oms_policy:
        keys["oms_policy"] = payload.oms_policy
    if payload.birth_date:
        keys["birth_date"] = payload.birth_date.isoformat()
    return keys
