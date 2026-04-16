from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.document_template import DocumentTemplate
from app.schemas.document_generation import DocumentGenerateRequest, DocumentGenerateResponse
from app.schemas.document_template import DocumentTemplateRead
from app.services.document_generator import generate_document

router = APIRouter()


@router.get("/templates", response_model=list[DocumentTemplateRead])
def list_document_templates(db: Session = Depends(get_db)) -> list[DocumentTemplateRead]:
    templates = db.execute(select(DocumentTemplate).where(DocumentTemplate.is_active.is_(True))).scalars().all()
    return [DocumentTemplateRead.model_validate(item) for item in templates]


@router.post("/generate", response_model=DocumentGenerateResponse)
def generate_document_file(payload: DocumentGenerateRequest, db: Session = Depends(get_db)) -> DocumentGenerateResponse:
    try:
        return generate_document(
            db,
            template_id=payload.template_id,
            template_code=payload.template_code,
            client_id=payload.client_id,
            encounter_id=payload.encounter_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/generated/{file_name}")
def download_generated_file(file_name: str) -> FileResponse:
    generated_dir = Path(settings.generated_documents_dir).resolve()
    file_path = (generated_dir / file_name).resolve()
    if generated_dir not in file_path.parents or not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден")
    return FileResponse(path=file_path, filename=file_path.name)
