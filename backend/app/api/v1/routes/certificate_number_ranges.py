from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.certificate_number_range import CertificateNumberRange
from app.schemas.certificate_number_range import CertificateNumberRangeRead

router = APIRouter()


@router.get("", response_model=list[CertificateNumberRangeRead], deprecated=True)
def list_certificate_number_ranges(db: Session = Depends(get_db)) -> list[CertificateNumberRangeRead]:
    items = db.execute(
        select(CertificateNumberRange)
        .where(CertificateNumberRange.is_active.is_(True))
        .order_by(CertificateNumberRange.id.asc())
    ).scalars().all()
    return [CertificateNumberRangeRead.model_validate(item) for item in items]
