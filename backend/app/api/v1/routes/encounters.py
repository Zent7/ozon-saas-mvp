from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.client import Client
from app.models.encounter import Encounter
from app.schemas.encounter import EncounterCreate, EncounterRead
from app.services.audit import write_audit_log

router = APIRouter()


@router.get("", response_model=list[EncounterRead])
def list_encounters(db: Session = Depends(get_db)) -> list[EncounterRead]:
    encounters = db.execute(select(Encounter).where(Encounter.deleted_at.is_(None)).order_by(Encounter.created_at.desc())).scalars().all()
    return [EncounterRead.model_validate(item) for item in encounters]


@router.get("/{encounter_id}", response_model=EncounterRead)
def get_encounter(encounter_id: int, db: Session = Depends(get_db)) -> EncounterRead:
    encounter = db.get(Encounter, encounter_id)
    if encounter is None or encounter.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Обращение не найдено")
    return EncounterRead.model_validate(encounter)


@router.post("", response_model=EncounterRead)
def create_encounter(payload: EncounterCreate, db: Session = Depends(get_db)) -> EncounterRead:
    client = db.get(Client, payload.client_id)
    if client is None or client.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Клиент не найден")

    encounter = Encounter(**payload.model_dump(), created_by_user_id=1, status="draft")
    db.add(encounter)
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
