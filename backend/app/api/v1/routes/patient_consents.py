from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.patient_consent import PatientConsent
from app.schemas.patient_consent import PatientConsentRead

router = APIRouter()


@router.get("", response_model=list[PatientConsentRead])
def list_patient_consents(
    client_id: int | None = Query(default=None),
    encounter_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[PatientConsentRead]:
    query = select(PatientConsent).order_by(PatientConsent.signed_at.desc(), PatientConsent.id.desc())
    if client_id is not None:
        query = query.where(PatientConsent.client_id == client_id)
    if encounter_id is not None:
        query = query.where(PatientConsent.encounter_id == encounter_id)
    consents = db.execute(query).scalars().all()
    return [PatientConsentRead.model_validate(item) for item in consents]
