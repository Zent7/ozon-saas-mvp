from app.schemas.client import ClientCreate


def build_duplicate_check_keys(payload: ClientCreate) -> dict[str, str]:
    keys: dict[str, str] = {}
    if payload.phone:
        keys["phone"] = payload.phone
    if payload.snils:
        keys["snils"] = payload.snils
    if payload.oms_policy:
        keys["oms_policy"] = payload.oms_policy
    return keys
