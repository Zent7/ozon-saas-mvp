from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.encounter_service import EncounterService
from app.schemas.encounter_service import EncounterServiceRead

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
