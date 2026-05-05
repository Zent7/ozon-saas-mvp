from __future__ import annotations

from datetime import date
import json
import re
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, func, select

from app.db.session import SessionLocal
from app.models.client import Client
from app.models.doctor_exam import DoctorExam
from app.models.document_template import DocumentTemplate
from app.models.encounter import Encounter
from app.models.encounter_service import EncounterService
from app.models.service import Service
from app.services.document_generator import generate_document


REPORT_PATH = Path(__file__).resolve().parents[2] / "docs" / "document-template-audit.md"
TOKEN_PATTERN = r"([A-Za-z0-9_!]+(?:\s*\.\s*[A-Za-z0-9_!]+)*)"


def normalize_token(value: str) -> str:
    return re.sub(r"\s+", "", value or "")


def unresolved_tokens(path: Path) -> list[str]:
    if path.suffix.lower() == ".docx":
        with zipfile.ZipFile(path, "r") as archive:
            xml_parts = [
                archive.read(name).decode("utf-8", errors="ignore")
                for name in archive.namelist()
                if name.startswith("word/") and name.endswith(".xml")
            ]
            text = "\n".join(xml_parts)
    else:
        text = path.read_text(encoding="utf-8", errors="ignore")

    tokens = {normalize_token(value) for value in re.findall(rf"\[\s*\|?\s*{TOKEN_PATTERN}\s*\|?\s*\]", text)}
    tokens.update(normalize_token(value) for value in re.findall(rf"\{{\{{\s*{TOKEN_PATTERN}\s*\}}\}}", text))
    return sorted(tokens)


def docx_text_preview(path: Path, limit: int = 500) -> str:
    if path.suffix.lower() != ".docx":
        return path.read_text(encoding="utf-8", errors="ignore")[:limit]
    with zipfile.ZipFile(path, "r") as archive:
        xml = archive.read("word/document.xml").decode("utf-8", errors="ignore")
    try:
        root = ET.fromstring(xml)
        values = [
            node.text or ""
            for node in root.findall(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
        ]
    except ET.ParseError:
        values = re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml)
    text = re.sub(r"\s+", " ", " ".join(values)).strip()
    return text[:limit]


def create_test_context(db: SessionLocal) -> tuple[Client, Encounter]:
    service = db.execute(select(Service).where(Service.is_active.is_(True)).order_by(Service.id)).scalars().first()
    if service is None:
        raise RuntimeError("No active services found")

    next_number = (db.execute(select(func.max(Client.patient_number))).scalar_one() or 0) + 1
    client = Client(
        patient_number=next_number,
        last_name="Р”РѕРєСѓРјРµРЅС‚",
        first_name="РўРµСЃС‚",
        middle_name="РџСЂРѕРІРµСЂРєР°",
        birth_date=date(1990, 1, 15),
        sex="M",
        phone="+7 999 000-00-00",
        email="test@example.local",
        document_series="4501",
        document_number="123456",
        document_issued_by="Р“РЈ РњР’Р” Р РѕСЃСЃРёРё",
        document_issued_date=date(2020, 2, 20),
        snils="123-456-789 00",
        oms_policy="1234567890123456",
        registration_text="Р РѕСЃСЃРёСЏ, Рі. РџРѕРєСЂРѕРІ, СѓР». Р’РѕСЃС‚РѕС‡РЅР°СЏ, Рґ. 2, РєРІ. 10",
        address_text="Р РѕСЃСЃРёСЏ, Рі. РџРѕРєСЂРѕРІ, СѓР». Р’РѕСЃС‚РѕС‡РЅР°СЏ, Рґ. 2, РєРІ. 10",
        admission_category="A B C D",
        reference_number="777",
        card_number="555",
        organization="РћРћРћ РўРµСЃС‚",
        mkb10="Z00.0",
        indications="РџСѓРЅРєС‚С‹ РІСЂРµРґРЅРѕСЃС‚Рё РЅРµ СѓРєР°Р·Р°РЅС‹",
    )
    db.add(client)
    db.flush()

    encounter = Encounter(
        center_id=1,
        client_id=client.id,
        encounter_date=date.today(),
        payment_type="cash",
        total_amount=1500,
        comment="РџСЂРѕРІРµСЂРєР° РіРµРЅРµСЂР°С†РёРё РґРѕРєСѓРјРµРЅС‚РѕРІ",
        status="completed",
    )
    db.add(encounter)
    db.flush()
    db.add(
        EncounterService(
            encounter_id=encounter.id,
            service_id=service.id,
            quantity=1,
            unit_price=service.price,
            line_total=service.price,
        )
    )
    db.add(
        DoctorExam(
            client_id=client.id,
            encounter_id=encounter.id,
            doctor_role_id="therapist",
            doctor_name="РўРµСЂР°РїРµРІС‚",
            fields_json={"diagnosis": "РљР»РёРЅРёС‡РµСЃРєРё Р·РґРѕСЂРѕРІ", "mkb10": "Z00.0"},
            is_completed=True,
        )
    )
    db.commit()
    return client, encounter


def cleanup(db: SessionLocal, client: Client | None, generated: list[Path]) -> None:
    for path in generated:
        path.unlink(missing_ok=True)
    if client is None:
        return
    db.rollback()
    encounter_ids = db.execute(select(Encounter.id).where(Encounter.client_id == client.id)).scalars().all()
    db.execute(delete(DoctorExam).where(DoctorExam.client_id == client.id))
    if encounter_ids:
        db.execute(delete(EncounterService).where(EncounterService.encounter_id.in_(encounter_ids)))
        db.execute(delete(Encounter).where(Encounter.id.in_(encounter_ids)))
    db.execute(delete(Client).where(Client.id == client.id))
    db.commit()


def main() -> None:
    db = SessionLocal()
    client: Client | None = None
    generated: list[Path] = []
    results = []
    try:
        client, encounter = create_test_context(db)
        templates = db.execute(select(DocumentTemplate).where(DocumentTemplate.is_active.is_(True)).order_by(DocumentTemplate.name)).scalars().all()
        for template in templates:
            source_path = Path(template.file_path or "")
            if not source_path.exists():
                results.append({"template": template.file_name, "status": "missing-file"})
                continue
            if source_path.suffix.lower() == ".docx":
                try:
                    with zipfile.ZipFile(source_path, "r") as archive:
                        archive.testzip()
                except zipfile.BadZipFile:
                    results.append({"template": template.file_name, "status": "broken-docx"})
                    continue

            try:
                response = generate_document(
                    db,
                    template_id=template.id,
                    template_code=None,
                    client_id=client.id,
                    encounter_id=encounter.id,
                )
                path = Path(response.output_file_path)
                generated.append(path)
                results.append(
                    {
                        "template": template.file_name,
                        "status": "ok",
                        "type": template.template_type,
                        "unresolved": unresolved_tokens(path),
                        "preview": docx_text_preview(path),
                    }
                )
            except Exception as exc:
                results.append({"template": template.file_name, "status": "generation-error", "error": str(exc)})

        ok_count = sum(1 for item in results if item["status"] == "ok" and not item.get("unresolved"))
        REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
        lines = [
            "# РџСЂРѕРІРµСЂРєР° С€Р°Р±Р»РѕРЅРѕРІ РґРѕРєСѓРјРµРЅС‚РѕРІ",
            "",
            f"Р’СЃРµРіРѕ С€Р°Р±Р»РѕРЅРѕРІ РІ Р‘Р”: {len(results)}",
            f"РЈСЃРїРµС€РЅРѕ РіРµРЅРµСЂРёСЂСѓСЋС‚СЃСЏ Р±РµР· РЅРµР·Р°РјРµРЅРµРЅРЅС‹С… РїРѕР»РµР№: {ok_count}",
            "",
            "## РС‚РѕРі РїРѕ С„Р°Р№Р»Р°Рј",
            "",
            "| Р¤Р°Р№Р» | РЎС‚Р°С‚СѓСЃ | РќРµР·Р°РјРµРЅРµРЅРЅС‹Рµ РїРѕР»СЏ | РўРµРєСЃС‚РѕРІС‹Р№ РїСЂРµРґРїСЂРѕСЃРјРѕС‚СЂ |",
            "|---|---|---|---|",
        ]
        for item in results:
            unresolved = ", ".join(item.get("unresolved") or [])
            preview = (item.get("preview") or item.get("error") or "").replace("|", "\\|").replace("\n", " ")
            lines.append(f"| {item['template']} | {item['status']} | {unresolved} | {preview[:220]} |")
        lines.extend(["", "```json", json.dumps(results, ensure_ascii=False, indent=2), "```", ""])
        REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")
        print({"templates": len(results), "ok_without_unresolved": ok_count, "report": str(REPORT_PATH)})
    finally:
        cleanup(db, client, generated)
        db.close()


if __name__ == "__main__":
    main()
