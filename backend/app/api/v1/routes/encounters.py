from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.client import Client
from app.models.encounter import Encounter
from app.models.payment import Payment
from app.schemas.encounter import EncounterCreate, EncounterRead, EncounterUpdate
from app.services.audit import write_audit_log

router = APIRouter()


def sync_primary_payment(
    db: Session,
    encounter: Encounter,
    *,
    default_comment: str = "Первичный платеж",
) -> Payment:
    payment = db.execute(
        select(Payment).where(Payment.encounter_id == encounter.id).order_by(Payment.id.asc()).limit(1)
    ).scalar_one_or_none()
    if payment is None:
        payment = Payment(
            encounter_id=encounter.id,
            created_by_user_id=encounter.created_by_user_id,
        )
        db.add(payment)

    payment.payment_date = encounter.encounter_date
    payment.payment_type = encounter.payment_type
    payment.amount = encounter.total_amount
    payment.status = "paid"
    payment.comment = encounter.comment or default_comment
    return payment


@router.get("", response_model=list[EncounterRead])
def list_encounters(
    client_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[EncounterRead]:
    query = select(Encounter).where(Encounter.deleted_at.is_(None))
    if client_id is not None:
        query = query.where(Encounter.client_id == client_id)
    query = query.order_by(Encounter.created_at.desc())
    encounters = db.execute(query).scalars().all()
    return [EncounterRead.model_validate(item) for item in encounters]


@router.get("/{encounter_id}", response_model=EncounterRead)
def get_encounter(encounter_id: int, db: Session = Depends(get_db)) -> EncounterRead:
    encounter = db.get(Encounter, encounter_id)
    if encounter is None or encounter.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РћР±СЂР°С‰РµРЅРёРµ РЅРµ РЅР°Р№РґРµРЅРѕ")
    return EncounterRead.model_validate(encounter)


@router.post("", response_model=EncounterRead)
def create_encounter(payload: EncounterCreate, db: Session = Depends(get_db)) -> EncounterRead:
    client = db.get(Client, payload.client_id)
    if client is None or client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РљР»РёРµРЅС‚ РЅРµ РЅР°Р№РґРµРЅ")

    encounter = Encounter(**payload.model_dump(), created_by_user_id=1, status="draft")
    client.encounter_date_text = payload.encounter_date.isoformat()
    db.add(encounter)
    db.flush()
    sync_primary_payment(db, encounter)
    db.commit()
    db.refresh(encounter)
    write_audit_log(
        db,
        entity_type="encounter",
        entity_id=encounter.id,
        action="create",
        user_id=1,
        center_id=encounter.center_id,
        payload_json={"client_id": encounter.client_id},
    )
    return EncounterRead.model_validate(encounter)


@router.put("/{encounter_id}", response_model=EncounterRead)
def update_encounter(encounter_id: int, payload: EncounterUpdate, db: Session = Depends(get_db)) -> EncounterRead:
    encounter = db.get(Encounter, encounter_id)
    if encounter is None or encounter.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РћР±СЂР°С‰РµРЅРёРµ РЅРµ РЅР°Р№РґРµРЅРѕ")

    encounter_date_before_update = encounter.encounter_date
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(encounter, key, value)

    if payload.encounter_date is not None and payload.encounter_date != encounter_date_before_update:
        client = db.get(Client, encounter.client_id)
        if client is not None and client.deleted_at is None:
            client.encounter_date_text = payload.encounter_date.isoformat()

    sync_primary_payment(db, encounter)
    db.commit()
    db.refresh(encounter)
    write_audit_log(
        db,
        entity_type="encounter",
        entity_id=encounter.id,
        action="update",
        user_id=1,
        center_id=encounter.center_id,
        payload_json={"client_id": encounter.client_id, "status": encounter.status},
    )
    return EncounterRead.model_validate(encounter)


@router.delete("/{encounter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_encounter(encounter_id: int, db: Session = Depends(get_db)) -> None:
    encounter = db.get(Encounter, encounter_id)
    if encounter is None or encounter.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="РћР±СЂР°С‰РµРЅРёРµ РЅРµ РЅР°Р№РґРµРЅРѕ")

    encounter.deleted_at = datetime.now(timezone.utc)
    db.commit()
    write_audit_log(
        db,
        entity_type="encounter",
        entity_id=encounter.id,
        action="delete",
        user_id=1,
        center_id=encounter.center_id,
        payload_json={"client_id": encounter.client_id},
    )
