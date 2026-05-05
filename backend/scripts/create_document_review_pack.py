from __future__ import annotations

from datetime import date
import shutil
import sys
import zipfile
from pathlib import Path

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


OUTPUT_DIR = Path(__file__).resolve().parents[2] / "docs" / "generated-document-review"


def safe_name(value: str) -> str:
    return "".join(char if char not in '<>:"/\\|?*' else "_" for char in value)


def main() -> None:
    db = SessionLocal()
    generated_storage_files: list[Path] = []
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
            email="test@example.local",
            document_series="4501",
            document_number="123456",
            document_issued_by="ГУ МВД России",
            document_issued_date=date(2020, 2, 20),
            snils="123-456-789 00",
            oms_policy="1234567890123456",
            registration_text="Россия, г. Покров, ул. Восточная, д. 2, кв. 10",
            address_text="Россия, г. Покров, ул. Восточная, д. 2, кв. 10",
            admission_category="A B C D",
            reference_number="777",
            card_number="555",
            organization="ООО Тест",
            mkb10="Z00.0",
            indications="Пункты вредности не указаны",
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

        if OUTPUT_DIR.exists():
            shutil.rmtree(OUTPUT_DIR)
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        templates = db.execute(select(DocumentTemplate).where(DocumentTemplate.is_active.is_(True)).order_by(DocumentTemplate.name)).scalars().all()
        ok = []
        skipped = []
        for template in templates:
            source = Path(template.file_path or "")
            if source.suffix.lower() == ".docx":
                try:
                    with zipfile.ZipFile(source, "r") as archive:
                        archive.testzip()
                except zipfile.BadZipFile:
                    skipped.append(f"{template.file_name}: broken-docx")
                    continue
            try:
                response = generate_document(
                    db,
                    template_id=template.id,
                    template_code=None,
                    client_id=client.id,
                    encounter_id=encounter.id,
                )
                generated = Path(response.output_file_path)
                generated_storage_files.append(generated)
                target = OUTPUT_DIR / f"{template.id:03d}_{safe_name(template.file_name)}"
                shutil.copy2(generated, target)
                ok.append(target.name)
            except Exception as exc:
                skipped.append(f"{template.file_name}: {exc}")

        (OUTPUT_DIR / "_README.txt").write_text(
            "Папка для ручной проверки шаблонов.\n"
            "Открой DOCX/XML файлы и проверь внешний вид: переносы, подписи, печати, пустые строки.\n"
            "Файлы созданы на тестовом клиенте Документ Тест Проверка.\n\n"
            f"Сгенерировано: {len(ok)}\n"
            f"Пропущено: {len(skipped)}\n\n"
            "Пропущенные:\n" + "\n".join(skipped),
            encoding="utf-8",
        )
        print({"generated_review_files": len(ok), "skipped": skipped, "folder": str(OUTPUT_DIR)})
    finally:
        for path in generated_storage_files:
            path.unlink(missing_ok=True)
        if client is not None:
            db.rollback()
            encounter_ids = db.execute(select(Encounter.id).where(Encounter.client_id == client.id)).scalars().all()
            db.execute(delete(DoctorExam).where(DoctorExam.client_id == client.id))
            if encounter_ids:
                db.execute(delete(EncounterService).where(EncounterService.encounter_id.in_(encounter_ids)))
                db.execute(delete(Encounter).where(Encounter.id.in_(encounter_ids)))
            db.execute(delete(Client).where(Client.id == client.id))
            db.commit()
        db.close()


if __name__ == "__main__":
    main()
