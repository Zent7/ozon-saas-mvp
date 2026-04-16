from app.schemas.client import ClientCreate


def build_duplicate_check_keys(payload: ClientCreate) -> dict[str, str]:
    keys: dict[str, str] = {}
    full_name_key = " ".join(
        part.strip().lower()
        for part in [payload.last_name, payload.first_name, payload.middle_name or ""]
        if part and part.strip()
    )
    keys["full_name_birth_date"] = f"{full_name_key}|{payload.birth_date.isoformat()}"
    if payload.phone:
        keys["phone"] = payload.phone
    if payload.snils:
        keys["snils"] = payload.snils
    if payload.oms_policy:
        keys["oms_policy"] = payload.oms_policy
    return keys
