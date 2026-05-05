from __future__ import annotations

from datetime import date
import re
import sys
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, func, select

from app.db.session import SessionLocal
from app.models.client import Client
from app.models.client_document import ClientDocument
from app.models.doctor_exam import DoctorExam
from app.models.document_journal import DocumentJournalEntry
from app.models.document_template import DocumentTemplate
from app.models.encounter import Encounter
from app.models.encounter_service import EncounterService
from app.models.generated_document import GeneratedDocument
from app.models.medical_record import MedicalRecord, MedicalRecordEntry
from app.models.patient_consent import PatientConsent
from app.models.service import Service
from app.services.document_generator import generate_document


def unresolved_tokens(path: Path) -> list[str]:
    if path.suffix.lower() == ".docx":
        with zipfile.ZipFile(path, "r") as archive:
            text = archive.read("word/document.xml").decode("utf-8", errors="ignore")
    else:
        text = path.read_text(encoding="utf-8", errors="ignore")
    tokens = set(re.findall(r"\[\s*\|?\s*([A-Za-zА-Яа-яЁё0-9_.!]+)\s*\|?\s*\]", text))
    tokens.update(re.findall(r"\{\{\s*([A-Za-zА-Яа-яЁё0-9_.!]+)\s*\}\}", text))
    return sorted(tokens)


def main() -> None:
    db = SessionLocal()
    generated: list[Path] = []
    client: Client | None = None
    try:
        service = db.execute(select(Service).where(Service.is_active.is_(True)).order_by(Service.id)).scalars().first()
        if service is None:
            raise RuntimeError("No active services found")
        next_number = (db.execute(select(func.max(Client.patient_number))).scalar_one() or 0) + 1
        client = Client(
            patient_number=next_number,
            last_name="Документ",
            first_name="Тест",
            middle_name="Проверка",
            birth_date=date(1990, 1, 15),
            sex="M",
            phone="+7 999 000-00-00",
            document_series="4501",
            document_number="123456",
            document_issued_by="ГУ МВД России",
            document_issued_date=date(2020, 2, 20),
            snils="123-456-789 00",
            oms_policy="1234567890123456",
            registration_text="Россия, г. Покров, ул. Восточная, д. 2, кв. 10",
            address_text="Россия, г. Покров, ул. Восточная, д. 2, кв. 10",
            admission_category="A B C D",
            organization="ООО Тест",
            mkb10="Z00.0",
        )
        db.add(client)
        db.flush()

        encounter = Encounter(
            center_id=1,
            client_id=client.id,
            encounter_date=date.today(),
            payment_type="cash",
            total_amount=1500,
            comment="Проверка генерации документов",
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
                doctor_name="Терапевт",
                fields_json={"diagnosis": "Клинически здоров", "mkb10": "Z00.0"},
                is_completed=True,
            )
        )
        db.commit()

        templates = (
            db.execute(
                select(DocumentTemplate)
                .where(DocumentTemplate.is_active.is_(True))
                .where(
                    DocumentTemplate.name.ilike("%082%")
                    | DocumentTemplate.name.ilike("%072%")
                    | DocumentTemplate.name.ilike("%Водительская_шаблон%")
                    | DocumentTemplate.name.ilike("%ГТО1144%")
                )
                .order_by(DocumentTemplate.id)
            )
            .scalars()
            .all()
        )

        results = []
        for template in templates[:8]:
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
                        "type": template.template_type,
                        "file": path.name,
                        "unresolved": unresolved_tokens(path),
                        "service": response.generated_fields.get("OrderService"),
                        "diagnosis": response.generated_fields.get("Diagnosis"),
                    }
                )
            except Exception as exc:
                results.append({"template": template.file_name, "error": str(exc)})

        print({"checked_templates": len(results), "results": results})
    finally:
        for path in generated:
            path.unlink(missing_ok=True)
        if client is not None:
            db.rollback()
            encounter_ids = db.execute(select(Encounter.id).where(Encounter.client_id == client.id)).scalars().all()
            medical_record_ids = db.execute(select(MedicalRecord.id).where(MedicalRecord.client_id == client.id)).scalars().all()
            generated_document_ids = db.execute(
                select(GeneratedDocument.id).where(GeneratedDocument.client_id == client.id)
            ).scalars().all()

            db.execute(delete(DocumentJournalEntry).where(DocumentJournalEntry.client_id == client.id))
            db.execute(delete(ClientDocument).where(ClientDocument.client_id == client.id))
            db.execute(delete(PatientConsent).where(PatientConsent.client_id == client.id))
            if medical_record_ids:
                db.execute(delete(MedicalRecordEntry).where(MedicalRecordEntry.medical_record_id.in_(medical_record_ids)))
                db.execute(delete(MedicalRecord).where(MedicalRecord.id.in_(medical_record_ids)))
            if generated_document_ids:
                db.execute(
                    delete(DocumentJournalEntry).where(DocumentJournalEntry.generated_document_id.in_(generated_document_ids))
                )
                db.execute(delete(GeneratedDocument).where(GeneratedDocument.id.in_(generated_document_ids)))
            db.execute(delete(DoctorExam).where(DoctorExam.client_id == client.id))
            if encounter_ids:
                db.execute(delete(EncounterService).where(EncounterService.encounter_id.in_(encounter_ids)))
                db.execute(delete(Encounter).where(Encounter.id.in_(encounter_ids)))
            db.execute(delete(Client).where(Client.id == client.id))
            db.commit()
        db.close()


if __name__ == "__main__":
    main()
