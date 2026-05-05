from pathlib import Path
import os

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.document_template import DocumentTemplate
from app.schemas.document_generation import DocumentGenerateRequest, DocumentGenerateResponse, DocumentPrintResponse
from app.schemas.document_template import DocumentTemplateRead
from app.services.blank_forms import BlankServiceError
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
    except BlankServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/print", response_model=DocumentPrintResponse)
def print_document_file(payload: DocumentGenerateRequest, db: Session = Depends(get_db)) -> DocumentPrintResponse:
    try:
        generated = generate_document(
            db,
            template_id=payload.template_id,
            template_code=payload.template_code,
            client_id=payload.client_id,
            encounter_id=payload.encounter_id,
        )
        if not hasattr(os, "startfile"):
            raise ValueError("Печать документов поддерживается только на Windows.")
        os.startfile(generated.output_file_path, "print")
        return DocumentPrintResponse(
            **generated.model_dump(),
            printed=True,
            message=f"Документ {generated.output_file_name} отправлен на печать.",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except BlankServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось отправить документ на печать: {exc}",
        ) from exc


@router.get("/generated/{file_name}")
def download_generated_file(file_name: str, inline: bool = Query(default=False)) -> FileResponse:
    generated_dir = Path(settings.generated_documents_dir).resolve()
    file_path = next((path.resolve() for path in generated_dir.rglob(file_name) if path.is_file()), None)
    if file_path is None or (generated_dir not in file_path.parents and file_path != generated_dir):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден")
    return FileResponse(
        path=file_path,
        filename=file_path.name,
        content_disposition_type="inline" if inline else "attachment",
    )
