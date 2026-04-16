from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.client_document import ClientDocument
from app.schemas.client_document import ClientDocumentRead

router = APIRouter()


@router.get("", response_model=list[ClientDocumentRead])
def list_client_documents(
    client_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[ClientDocumentRead]:
    query = select(ClientDocument).order_by(ClientDocument.id.desc())
    if client_id is not None:
        query = query.where(ClientDocument.client_id == client_id)
    items = db.execute(query).scalars().all()
    return [ClientDocumentRead.model_validate(item) for item in items]
