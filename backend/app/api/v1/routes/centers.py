from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.center import Center
from app.schemas.center import CenterRead

router = APIRouter()


@router.get("", response_model=list[CenterRead])
def list_centers(db: Session = Depends(get_db)) -> list[CenterRead]:
    items = db.execute(
        select(Center).where(Center.is_active.is_(True)).order_by(Center.name.asc(), Center.id.asc())
    ).scalars().all()
    return [CenterRead.model_validate(item) for item in items]
