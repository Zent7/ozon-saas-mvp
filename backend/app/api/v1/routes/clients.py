from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientRead
from app.services.audit import write_audit_log
from app.services.duplicates import build_duplicate_check_keys

router = APIRouter()


@router.get("", response_model=list[ClientRead])
def list_clients(
    search: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[ClientRead]:
    query = select(Client).where(Client.deleted_at.is_(None)).order_by(Client.patient_number.desc())
    if search:
        value = search.strip()
        pattern = f"%{value}%"
        numeric_value = int(value) if value.isdigit() and len(value) <= 9 else None
        search_conditions = [
            Client.last_name.ilike(pattern),
            Client.first_name.ilike(pattern),
            Client.middle_name.ilike(pattern),
            Client.phone.ilike(pattern),
            Client.snils.ilike(pattern),
            Client.oms_policy.ilike(pattern),
        ]
        if numeric_value is not None:
            search_conditions.insert(0, Client.patient_number == numeric_value)
        query = query.where(
            or_(*search_conditions)
        )
    clients = db.execute(query.limit(limit)).scalars().all()
    return [ClientRead.model_validate(item) for item in clients]


@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: int, db: Session = Depends(get_db)) -> ClientRead:
    client = db.get(Client, client_id)
    if client is None or client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")
    return ClientRead.model_validate(client)


@router.post("", response_model=ClientRead)
def create_client(payload: ClientCreate, db: Session = Depends(get_db)) -> ClientRead:
    duplicate_keys = build_duplicate_check_keys(payload)
    duplicate_conditions = []
    if payload.phone:
        duplicate_conditions.append(Client.phone == payload.phone)
    if payload.snils:
        duplicate_conditions.append(Client.snils == payload.snils)
    if payload.oms_policy:
        duplicate_conditions.append(Client.oms_policy == payload.oms_policy)

    possible_duplicate = None
    if duplicate_conditions:
        possible_duplicate = db.execute(
            select(Client).where(
                Client.deleted_at.is_(None),
                or_(*duplicate_conditions),
            )
        ).scalars().first()

    if possible_duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Найден возможный дубль клиента",
                "duplicate_keys": duplicate_keys,
                "client_id": possible_duplicate.id,
            },
        )

    next_patient_number = (db.execute(select(func.max(Client.patient_number))).scalar_one() or 0) + 1
    client = Client(**payload.model_dump(), patient_number=next_patient_number, created_by_user_id=1)
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
