from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document_journal import DocumentJournalEntry, SpoiledCertificateBlank
from app.schemas.document_journal import DocumentJournalEntryRead, SpoiledCertificateBlankRead

router = APIRouter()


@router.get("", response_model=list[DocumentJournalEntryRead])
def list_document_journal_entries(
    journal_code: str | None = Query(default=None),
    client_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[DocumentJournalEntryRead]:
    query = select(DocumentJournalEntry).where(DocumentJournalEntry.deleted_at.is_(None))
    if journal_code:
        query = query.where(DocumentJournalEntry.journal_code == journal_code)
    if client_id is not None:
        query = query.where(DocumentJournalEntry.client_id == client_id)
    query = query.order_by(DocumentJournalEntry.issued_at.desc(), DocumentJournalEntry.id.desc())
    entries = db.execute(query).scalars().all()
    return [DocumentJournalEntryRead.model_validate(item) for item in entries]


@router.get("/spoiled-blanks", response_model=list[SpoiledCertificateBlankRead], deprecated=True)
def list_spoiled_certificate_blanks(db: Session = Depends(get_db)) -> list[SpoiledCertificateBlankRead]:
    blanks = db.execute(
        select(SpoiledCertificateBlank).order_by(SpoiledCertificateBlank.spoiled_at.desc(), SpoiledCertificateBlank.id.desc())
    ).scalars().all()
    return [SpoiledCertificateBlankRead.model_validate(item) for item in blanks]
