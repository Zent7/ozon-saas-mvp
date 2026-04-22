from __future__ import annotations

import json
import re
from datetime import date, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.client import Client
from app.services.audit import write_audit_log

router = APIRouter()


ROOT_DIR = Path(__file__).resolve().parents[5]
LEGACY_DATA_PATH = ROOT_DIR / "demo" / "legacy-data.js"


def extract_window_json(source: str, variable_name: str) -> Any:
    pattern = rf"window\.{re.escape(variable_name)}\s*=\s*(.*?);(?=\s*window\.|\s*$)"
    match = re.search(pattern, source, flags=re.S)
    if not match:
        raise ValueError(f"Не найден блок {variable_name}")
    return json.loads(match.group(1))


def split_full_name(full_name: str | None) -> tuple[str, str, str | None]:
    parts = str(full_name or "").strip().split()
    if not parts:
        return "Без фамилии", "Без имени", None
    return parts[0], parts[1] if len(parts) > 1 else "Без имени", " ".join(parts[2:]) or None


def parse_date(value: str | None) -> date:
    text = str(value or "").strip()
    for date_format in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, date_format).date()
        except ValueError:
            continue
    return date(1900, 1, 1)


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


@router.post("/demo-legacy")
def import_demo_legacy(db: Session = Depends(get_db)) -> dict[str, int | str]:
    if not LEGACY_DATA_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Файл demo-базы не найден: {LEGACY_DATA_PATH}",
        )

    source = LEGACY_DATA_PATH.read_text(encoding="utf-8")
    try:
        clients = extract_window_json(source, "LEGACY_CLIENTS")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    created = 0
    updated = 0

    for item in clients:
        legacy_source_id = int(item.get("id") or 0) or None
        patient_number = int(item.get("patientNumber") or 0)
        if not patient_number:
            continue

        client = None
        if legacy_source_id is not None:
            client = db.execute(select(Client).where(Client.legacy_source_id == legacy_source_id)).scalar_one_or_none()
        if client is None:
            client = db.execute(select(Client).where(Client.patient_number == patient_number)).scalar_one_or_none()

        last_name, first_name, middle_name = split_full_name(item.get("fullName"))
        payload = {
            "legacy_source_id": legacy_source_id,
            "patient_number": patient_number,
            "last_name": last_name,
            "first_name": first_name,
            "middle_name": middle_name,
            "birth_date": parse_date(item.get("birthDate")),
            "phone": normalize_text(item.get("phone")),
            "snils": normalize_text(item.get("snils")),
            "address_text": normalize_text(item.get("registration")),
            "registration_text": normalize_text(item.get("registration")),
            "notes": normalize_text(item.get("note")),
            "organization": normalize_text(item.get("organization")),
            "real_date_text": normalize_text(item.get("lastVisit")),
            "legacy_payload_json": item,
        }

        if client is None:
            db.add(Client(created_by_user_id=1, **payload))
            created += 1
        else:
            for key, value in payload.items():
                setattr(client, key, value)
            updated += 1

    db.commit()
    write_audit_log(
        db,
        entity_type="import",
        entity_id=0,
        action="demo_legacy_import",
        user_id=1,
        payload_json={"created": created, "updated": updated, "source": str(LEGACY_DATA_PATH)},
    )
    return {
        "source": str(LEGACY_DATA_PATH),
        "created": created,
        "updated": updated,
        "total": len(clients),
    }
