from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.recall import Recall
from app.schemas.recall import RecallRead

router = APIRouter()


@router.get("", response_model=list[RecallRead])
def list_recalls(db: Session = Depends(get_db)) -> list[RecallRead]:
    recalls = db.execute(select(Recall).order_by(Recall.planned_date.asc())).scalars().all()
    return [RecallRead.model_validate(item) for item in recalls]
