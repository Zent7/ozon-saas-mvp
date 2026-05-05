from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.visit_type import VisitType, VisitTypeService
from app.schemas.visit_type import VisitTypeRead, VisitTypeServiceRead

router = APIRouter()


@router.get("", response_model=list[VisitTypeRead])
def list_visit_types(db: Session = Depends(get_db)) -> list[VisitTypeRead]:
    items = db.execute(
        select(VisitType).where(VisitType.is_active.is_(True)).order_by(VisitType.id.asc())
    ).scalars().all()
    return [VisitTypeRead.model_validate(item) for item in items]


@router.get("/services", response_model=list[VisitTypeServiceRead])
def list_visit_type_services(
    visit_type_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[VisitTypeServiceRead]:
    query = select(VisitTypeService).order_by(VisitTypeService.visit_type_id.asc(), VisitTypeService.sort_order.asc())
    if visit_type_id is not None:
        query = query.where(VisitTypeService.visit_type_id == visit_type_id)
    items = db.execute(query).scalars().all()
    return [VisitTypeServiceRead.model_validate(item) for item in items]
