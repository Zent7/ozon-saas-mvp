from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.encounter import Encounter
from app.models.encounter_service import EncounterService
from app.models.service import Service
from app.schemas.encounter_service import EncounterServiceCreate, EncounterServiceRead

router = APIRouter()


@router.get("", response_model=list[EncounterServiceRead])
def list_encounter_services(
    encounter_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[EncounterServiceRead]:
    query = select(EncounterService).order_by(EncounterService.id.asc())
    if encounter_id is not None:
        query = query.where(EncounterService.encounter_id == encounter_id)
    items = db.execute(query).scalars().all()
    return [EncounterServiceRead.model_validate(item) for item in items]


@router.post("", response_model=EncounterServiceRead)
def create_encounter_service(
    payload: EncounterServiceCreate,
    db: Session = Depends(get_db),
) -> EncounterServiceRead:
    encounter = db.get(Encounter, payload.encounter_id)
    if encounter is None or encounter.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Обращение не найдено")

    service = db.get(Service, payload.service_id)
    if service is None or not service.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Услуга не найдена")

    item = EncounterService(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return EncounterServiceRead.model_validate(item)
