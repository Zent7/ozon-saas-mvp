from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.generated_document import GeneratedDocument
from app.schemas.generated_document import GeneratedDocumentRead

router = APIRouter()


@router.get("", response_model=list[GeneratedDocumentRead])
def list_generated_documents(
    client_id: int | None = Query(default=None),
    encounter_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[GeneratedDocumentRead]:
    query = select(GeneratedDocument).order_by(GeneratedDocument.generated_at.desc(), GeneratedDocument.id.desc())
    if client_id is not None:
        query = query.where(GeneratedDocument.client_id == client_id)
    if encounter_id is not None:
        query = query.where(GeneratedDocument.encounter_id == encounter_id)
    items = db.execute(query).scalars().all()
    return [GeneratedDocumentRead.model_validate(item) for item in items]
