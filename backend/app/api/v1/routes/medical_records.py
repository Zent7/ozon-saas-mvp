from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.medical_record import MedicalRecord, MedicalRecordEntry
from app.schemas.medical_record import (
    MedicalRecordCreate,
    MedicalRecordEntryCreate,
    MedicalRecordEntryRead,
    MedicalRecordEntryUpdate,
    MedicalRecordRead,
    MedicalRecordUpdate,
)

router = APIRouter()


def normalize_optional(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def apply_model_payload(instance: MedicalRecord | MedicalRecordEntry, payload: dict) -> None:
    for key, value in payload.items():
        if isinstance(value, str):
            value = normalize_optional(value)
        setattr(instance, key, value)


@router.get("", response_model=list[MedicalRecordRead])
def list_medical_records(
    client_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MedicalRecordRead]:
    query = select(MedicalRecord).where(MedicalRecord.deleted_at.is_(None)).order_by(MedicalRecord.id.desc())
    if client_id is not None:
        query = query.where(MedicalRecord.client_id == client_id)
    records = db.execute(query).scalars().all()
    return [MedicalRecordRead.model_validate(item) for item in records]


@router.get("/entries", response_model=list[MedicalRecordEntryRead])
def list_medical_record_entries(
    medical_record_id: int | None = Query(default=None),
    encounter_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MedicalRecordEntryRead]:
    query = select(MedicalRecordEntry).order_by(MedicalRecordEntry.entry_date.desc(), MedicalRecordEntry.id.desc())
    if medical_record_id is not None:
        query = query.where(MedicalRecordEntry.medical_record_id == medical_record_id)
    if encounter_id is not None:
        query = query.where(MedicalRecordEntry.encounter_id == encounter_id)
    entries = db.execute(query).scalars().all()
    return [MedicalRecordEntryRead.model_validate(item) for item in entries]


@router.post("", response_model=MedicalRecordRead, status_code=status.HTTP_201_CREATED)
def create_medical_record(
    payload: MedicalRecordCreate,
    db: Session = Depends(get_db),
) -> MedicalRecordRead:
    existing = db.execute(
        select(MedicalRecord).where(
            MedicalRecord.client_id == payload.client_id,
            MedicalRecord.deleted_at.is_(None),
        )
    ).scalars().first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Медицинская карта для пациента уже существует",
        )

    item = MedicalRecord()
    apply_model_payload(item, payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return MedicalRecordRead.model_validate(item)


@router.put("/{medical_record_id}", response_model=MedicalRecordRead)
def update_medical_record(
    medical_record_id: int,
    payload: MedicalRecordUpdate,
    db: Session = Depends(get_db),
) -> MedicalRecordRead:
    item = db.get(MedicalRecord, medical_record_id)
    if item is None or item.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Медицинская карта не найдена")

    apply_model_payload(item, payload.model_dump())
    db.commit()
    db.refresh(item)
    return MedicalRecordRead.model_validate(item)


@router.post("/entries", response_model=MedicalRecordEntryRead, status_code=status.HTTP_201_CREATED)
def create_medical_record_entry(
    payload: MedicalRecordEntryCreate,
    db: Session = Depends(get_db),
) -> MedicalRecordEntryRead:
    record = db.get(MedicalRecord, payload.medical_record_id)
    if record is None or record.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Медицинская карта не найдена")

    item = MedicalRecordEntry()
    apply_model_payload(item, payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return MedicalRecordEntryRead.model_validate(item)


@router.put("/entries/{entry_id}", response_model=MedicalRecordEntryRead)
def update_medical_record_entry(
    entry_id: int,
    payload: MedicalRecordEntryUpdate,
    db: Session = Depends(get_db),
) -> MedicalRecordEntryRead:
    item = db.get(MedicalRecordEntry, entry_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Запись медицинской карты не найдена")

    apply_model_payload(item, payload.model_dump())
    db.commit()
    db.refresh(item)
    return MedicalRecordEntryRead.model_validate(item)
