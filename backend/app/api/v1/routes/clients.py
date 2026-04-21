from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate
from app.services.audit import write_audit_log
from app.services.duplicates import build_duplicate_check_keys

router = APIRouter()


def normalize_optional(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def normalize_payload(payload: ClientCreate | ClientUpdate) -> dict:
    data = payload.model_dump()
    for key, value in list(data.items()):
        if isinstance(value, str):
            data[key] = normalize_optional(value)
    data["last_name"] = data["last_name"] or ""
    data["first_name"] = data["first_name"] or ""
    return data


def parse_search_date(value: str):
    for date_format in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, date_format).date()
        except ValueError:
            continue
    return None


def duplicate_conditions_for(payload: ClientCreate | ClientUpdate):
    if not (payload.last_name and payload.first_name and payload.middle_name):
        return []

    return [
        (func.lower(Client.last_name) == payload.last_name.lower())
        & (func.lower(Client.first_name) == payload.first_name.lower())
        & (func.lower(Client.middle_name) == payload.middle_name.lower())
    ]


def find_duplicate(
    db: Session,
    payload: ClientCreate | ClientUpdate,
    exclude_client_id: int | None = None,
) -> Client | None:
    conditions = duplicate_conditions_for(payload)
    if not conditions:
        return None

    query = select(Client).where(Client.deleted_at.is_(None), or_(*conditions))
    if exclude_client_id is not None:
        query = query.where(Client.id != exclude_client_id)
    return db.execute(query).scalars().first()


def duplicate_error(payload: ClientCreate | ClientUpdate, client: Client) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail={
            "message": "Клиент с таким полным ФИО уже есть",
            "duplicate_keys": build_duplicate_check_keys(payload),
            "client_id": client.id,
            "patient_number": client.patient_number,
            "full_name": f"{client.last_name} {client.first_name} {client.middle_name or ''}".strip(),
        },
    )


@router.get("", response_model=list[ClientRead])
def list_clients(
    search: str | None = Query(default=None),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[ClientRead]:
    value = search.strip() if search else ""
    if not value:
        return []

    pattern = f"%{value}%"
    name_tokens = value.split()
    numeric_value = int(value) if value.isdigit() and len(value) <= 9 else None
    date_value = parse_search_date(value)
    search_conditions = [
        Client.last_name.ilike(pattern),
        Client.first_name.ilike(pattern),
        Client.middle_name.ilike(pattern),
        Client.phone.ilike(pattern),
        Client.snils.ilike(pattern),
        Client.oms_policy.ilike(pattern),
        Client.document_series.ilike(pattern),
        Client.document_number.ilike(pattern),
    ]
    if name_tokens:
        search_conditions.append(
            and_(
                *[
                    or_(
                        Client.last_name.ilike(f"%{token}%"),
                        Client.first_name.ilike(f"%{token}%"),
                        Client.middle_name.ilike(f"%{token}%"),
                    )
                    for token in name_tokens
                ]
            )
        )
    if numeric_value is not None:
        search_conditions.insert(0, Client.patient_number == numeric_value)
    if date_value is not None:
        search_conditions.insert(0, Client.birth_date == date_value)

    query = (
        select(Client)
        .where(Client.deleted_at.is_(None), or_(*search_conditions))
        .order_by(Client.patient_number.desc())
        .limit(limit)
    )
    clients = db.execute(query).scalars().all()
    return [ClientRead.model_validate(item) for item in clients]


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)) -> ClientRead:
    client = db.get(Client, client_id)
    if client is None or client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    return ClientRead.model_validate(client)


@router.post("", response_model=ClientRead)
def create_client(payload: ClientCreate, db: Session = Depends(get_db)) -> ClientRead:
    normalized_data = normalize_payload(payload)
    normalized_payload = ClientCreate(**normalized_data)
    possible_duplicate = find_duplicate(db, normalized_payload)
    if possible_duplicate is not None:
        raise duplicate_error(normalized_payload, possible_duplicate)

    next_patient_number = (db.execute(select(func.max(Client.patient_number))).scalar_one() or 0) + 1
    client = Client(**normalized_data, patient_number=next_patient_number, created_by_user_id=1)
    db.add(client)
    db.commit()
    db.refresh(client)
    write_audit_log(
        db,
        entity_type="client",
        entity_id=client.id,
        action="create",
        user_id=1,
        payload_json={"full_name": f"{client.last_name} {client.first_name}"},
    )
    return ClientRead.model_validate(client)


@router.put("/{client_id}", response_model=ClientRead)
def update_client(client_id: int, payload: ClientUpdate, db: Session = Depends(get_db)) -> ClientRead:
    client = db.get(Client, client_id)
    if client is None or client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")

    normalized_data = normalize_payload(payload)
    normalized_payload = ClientUpdate(**normalized_data)
    possible_duplicate = find_duplicate(db, normalized_payload, exclude_client_id=client_id)
    if possible_duplicate is not None:
        raise duplicate_error(normalized_payload, possible_duplicate)

    for key, value in normalized_data.items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)
    write_audit_log(
        db,
        entity_type="client",
        entity_id=client.id,
        action="update",
        user_id=1,
        payload_json={"full_name": f"{client.last_name} {client.first_name}"},
    )
    return ClientRead.model_validate(client)
