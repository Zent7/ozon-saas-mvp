from app.schemas.client import ClientCreate, ClientUpdate


def build_duplicate_check_keys(payload: ClientCreate | ClientUpdate) -> dict[str, str]:
    keys: dict[str, str] = {}
    full_name = " ".join(
        item for item in [payload.last_name, payload.first_name, payload.middle_name] if item
    )
    if full_name:
        keys["full_name"] = full_name
    return keys
