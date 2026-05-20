from pathlib import Path
import shutil

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.document_template import DocumentTemplate
from app.models.generated_document import GeneratedDocument
from app.schemas.document_generation import (
    DocumentGenerateRequest,
    DocumentGenerateResponse,
    DocumentPrintResponse,
    DocumentPrintResultRequest,
    DocumentPrintResultResponse,
)
from app.schemas.document_template import DocumentTemplateRead
from app.services.blank_forms import BlankServiceError, NoFreeBlankError, spoil_for_generated_document
from app.services.document_generator import generate_document
from app.services.template_catalog import SUPPORTED_TEMPLATE_EXTENSIONS, get_templates_root, sync_document_template_catalog

router = APIRouter()


def _repair_mojibake(value: str) -> str:
    try:
        return value.encode("latin1").decode("utf-8")
    except UnicodeError:
        return value


def _resolve_template_file(template: DocumentTemplate) -> Path | None:
    candidates: list[Path] = []
    if template.file_path:
        candidates.append(Path(template.file_path))

    root = get_templates_root()
    names = [template.file_name]
    repaired_name = _repair_mojibake(template.file_name)
    if repaired_name != template.file_name:
        names.append(repaired_name)

    for name in names:
        if name:
            candidates.append(root / name)

    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved.is_file():
            return resolved
    return None


@router.get("/templates", response_model=list[DocumentTemplateRead])
def list_document_templates(db: Session = Depends(get_db)) -> list[DocumentTemplateRead]:
    templates = db.execute(select(DocumentTemplate).where(DocumentTemplate.is_active.is_(True))).scalars().all()
    return [DocumentTemplateRead.model_validate(item) for item in templates]


@router.post("/templates/refresh", response_model=list[DocumentTemplateRead])
def refresh_document_templates(db: Session = Depends(get_db)) -> list[DocumentTemplateRead]:
    sync_document_template_catalog(db)
    db.commit()
    templates = db.execute(select(DocumentTemplate).where(DocumentTemplate.is_active.is_(True))).scalars().all()
    return [DocumentTemplateRead.model_validate(item) for item in templates]


@router.get("/templates/{template_id}/file")
def open_document_template(template_id: int, db: Session = Depends(get_db)) -> FileResponse:
    template = db.get(DocumentTemplate, template_id)
    if template is None or not template.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Шаблон не найден")

    file_path = _resolve_template_file(template)
    if file_path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл шаблона не найден")

    return FileResponse(path=file_path, filename=file_path.name, content_disposition_type="inline")


@router.post("/templates/{template_id}/replace", response_model=DocumentTemplateRead)
def replace_document_template(
    template_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> DocumentTemplateRead:
    template = db.get(DocumentTemplate, template_id)
    if template is None or not template.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Шаблон не найден")

    target_path = _resolve_template_file(template) or Path(template.file_path).resolve()
    source_suffix = Path(file.filename or "").suffix.lower()
    target_suffix = target_path.suffix.lower()
    if source_suffix not in SUPPORTED_TEMPLATE_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Поддерживаются только .docx, .xml и .xls")
    if source_suffix != target_suffix:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Тип файла должен остаться {target_suffix}. Создайте новый шаблон отдельным файлом, если нужен другой тип.",
        )

    target_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = target_path.with_name(f"{target_path.name}.uploading")
    try:
        with temp_path.open("wb") as target_file:
            shutil.copyfileobj(file.file, target_file)
        temp_path.replace(target_path)
    except OSError as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Не удалось заменить шаблон: {exc}") from exc
    finally:
        file.file.close()
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)

    template.file_path = str(target_path)
    template.template_type = target_suffix.lstrip(".")
    template.output_format = target_suffix.lstrip(".")
    template.is_active = True
    db.commit()
    db.refresh(template)
    return DocumentTemplateRead.model_validate(template)


@router.post("/generate", response_model=DocumentGenerateResponse)
def generate_document_file(payload: DocumentGenerateRequest, db: Session = Depends(get_db)) -> DocumentGenerateResponse:
    try:
        result = generate_document(
            db,
            template_id=payload.template_id,
            template_code=payload.template_code,
            client_id=payload.client_id,
            encounter_id=payload.encounter_id,
            blank_form_id=payload.blank_form_id,
            print_variant=payload.print_variant,
        )
        db.commit()
        return result
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except NoFreeBlankError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except BlankServiceError as exc:
        db.rollback()
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
            blank_form_id=payload.blank_form_id,
            print_variant=payload.print_variant,
        )
        db.commit()
        return DocumentPrintResponse(
            **generated.model_dump(),
            printed=False,
            message=f"Документ {generated.output_file_name} сформирован и готов к открытию.",
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except NoFreeBlankError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except BlankServiceError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

@router.post("/print-result", response_model=DocumentPrintResultResponse)
def save_print_result(
    payload: DocumentPrintResultRequest,
    db: Session = Depends(get_db),
) -> DocumentPrintResultResponse:
    document = db.get(GeneratedDocument, payload.generated_document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Сформированный документ не найден")

    if payload.success:
        db.commit()
        return DocumentPrintResultResponse(
            generated_document_id=document.id,
            blank_form_id=document.blank_form_id,
            blank_status="issued" if document.blank_form_id else None,
            message="Результат печати подтвержден.",
        )

    try:
        form = spoil_for_generated_document(
            db,
            generated_document_id=document.id,
            reason=payload.reason,
            user_id=1,
        )
        db.commit()
        return DocumentPrintResultResponse(
            generated_document_id=document.id,
            blank_form_id=form.id if form is not None else document.blank_form_id,
            blank_status=form.status if form is not None else None,
            message="Бланк отмечен как испорченный.",
        )
    except BlankServiceError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


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
