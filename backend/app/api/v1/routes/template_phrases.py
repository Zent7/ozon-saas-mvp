from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.template_phrase import TemplatePhrase
from app.schemas.template_phrase import TemplatePhraseCreate, TemplatePhraseRead

router = APIRouter()


@router.get("", response_model=list[TemplatePhraseRead])
def list_template_phrases(
    doctor_role_id: int | None = Query(default=None),
    service_id: int | None = Query(default=None),
    code: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[TemplatePhraseRead]:
    query = select(TemplatePhrase).where(TemplatePhrase.is_active.is_(True))
    if doctor_role_id is not None:
        query = query.where(TemplatePhrase.doctor_role_id == doctor_role_id)
    if service_id is not None:
        query = query.where(TemplatePhrase.service_id == service_id)
    if code is not None:
        query = query.where(TemplatePhrase.code == code)
    query = query.order_by(TemplatePhrase.doctor_role_id.asc(), TemplatePhrase.is_default.desc(), TemplatePhrase.name.asc())
    items = db.execute(query).scalars().all()
    return [TemplatePhraseRead.model_validate(item) for item in items]


@router.post("", response_model=TemplatePhraseRead, status_code=status.HTTP_201_CREATED)
def create_template_phrase(
    payload: TemplatePhraseCreate,
    db: Session = Depends(get_db),
) -> TemplatePhraseRead:
    existing = db.execute(
        select(TemplatePhrase).where(
            TemplatePhrase.doctor_role_id == payload.doctor_role_id,
            TemplatePhrase.service_id == payload.service_id,
            TemplatePhrase.code == payload.code,
            TemplatePhrase.text == payload.text,
        )
    ).scalar_one_or_none()
    if existing is not None:
        return TemplatePhraseRead.model_validate(existing)

    phrase = TemplatePhrase(
        doctor_role_id=payload.doctor_role_id,
        service_id=payload.service_id,
        code=payload.code,
        name=payload.name,
        text=payload.text,
        gender=payload.gender,
        is_default=payload.is_default,
        is_active=payload.is_active,
    )
    db.add(phrase)
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    db.refresh(phrase)
    return TemplatePhraseRead.model_validate(phrase)
