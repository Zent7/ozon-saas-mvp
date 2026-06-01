from __future__ import annotations

from datetime import date
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, select

from app.db.session import SessionLocal
from app.models.client import Client
from app.models.client_document import ClientDocument
from app.models.doctor_exam import DoctorExam
from app.models.document_journal import DocumentJournalEntry
from app.models.encounter import Encounter
from app.models.encounter_service import EncounterService
from app.models.generated_document import GeneratedDocument
from app.models.medical_record import MedicalRecord, MedicalRecordEntry
from app.models.patient_consent import PatientConsent
from app.models.payment import Payment


API = os.environ.get("API_BASE_URL", "http://127.0.0.1:8000/api/v1").rstrip("/")


def request(method: str, path: str, payload: dict | None = None) -> tuple[int, object]:
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    req = urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read()
            if not body:
                return response.status, None
            return response.status, json.loads(body.decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(body)
        except json.JSONDecodeError:
            return exc.code, body


def cleanup(client_id: int | None) -> None:
    if client_id is None:
        return

    db = SessionLocal()
    try:
        encounter_ids = db.execute(select(Encounter.id).where(Encounter.client_id == client_id)).scalars().all()
        medical_record_ids = db.execute(select(MedicalRecord.id).where(MedicalRecord.client_id == client_id)).scalars().all()
        generated_document_ids = db.execute(
            select(GeneratedDocument.id).where(GeneratedDocument.client_id == client_id)
        ).scalars().all()

        db.execute(delete(DocumentJournalEntry).where(DocumentJournalEntry.client_id == client_id))
        db.execute(delete(ClientDocument).where(ClientDocument.client_id == client_id))
        db.execute(delete(PatientConsent).where(PatientConsent.client_id == client_id))

        if medical_record_ids:
            db.execute(delete(MedicalRecordEntry).where(MedicalRecordEntry.medical_record_id.in_(medical_record_ids)))
            db.execute(delete(MedicalRecord).where(MedicalRecord.id.in_(medical_record_ids)))

        if generated_document_ids:
            db.execute(
                delete(DocumentJournalEntry).where(DocumentJournalEntry.generated_document_id.in_(generated_document_ids))
            )
            db.execute(delete(GeneratedDocument).where(GeneratedDocument.id.in_(generated_document_ids)))

        db.execute(delete(DoctorExam).where(DoctorExam.client_id == client_id))
        if encounter_ids:
            db.execute(delete(EncounterService).where(EncounterService.encounter_id.in_(encounter_ids)))
            db.execute(delete(Payment).where(Payment.encounter_id.in_(encounter_ids)))
            db.execute(delete(Encounter).where(Encounter.id.in_(encounter_ids)))
        db.execute(delete(Client).where(Client.id == client_id))
        db.commit()
    finally:
        db.close()


def main() -> None:
    client_id: int | None = None
    generated_file: str | None = None
    try:
        status, health = request("GET", "/health")
        assert status == 200 and isinstance(health, dict) and health.get("status") == "ok", (status, health)

        status, services = request("GET", "/services")
        assert status == 200 and isinstance(services, list) and len(services) > 0, (status, services)
        service_id = services[0]["id"]

        payload = {
            "last_name": "Смоук",
            "first_name": "Тест",
            "middle_name": "Проверка",
            "birth_date": "1991-02-03",
            "phone": "+7 999 111-22-33",
            "registration_text": "Россия, г. Покров, ул. Проверочная, д. 1",
        }
        status, client = request("POST", "/clients", payload)
        assert status == 200, (status, client)
        client_id = client["id"]

        search = urllib.parse.quote("Смоук")
        status, clients = request("GET", f"/clients?search={search}&limit=5")
        assert status == 200 and isinstance(clients, list) and any(item["id"] == client_id for item in clients), (
            status,
            clients,
        )

        duplicate_status, duplicate = request("POST", "/clients", payload)
        assert duplicate_status == 409, (duplicate_status, duplicate)

        encounter_payload = {
            "center_id": 1,
            "client_id": client_id,
            "encounter_date": str(date.today()),
            "payment_type": "cash",
            "total_amount": 1500,
            "comment": "Smoke test",
            "status": "completed",
        }
        status, encounter = request("POST", "/encounters", encounter_payload)
        assert status == 200, (status, encounter)
        encounter_id = encounter["id"]

        status, encounter_service = request(
            "POST",
            "/encounter-services",
            {"encounter_id": encounter_id, "service_id": service_id, "quantity": 1, "unit_price": 1500, "line_total": 1500},
        )
        assert status == 200, (status, encounter_service)

        status, exam = request(
            "POST",
            "/doctor-exams",
            {
                "client_id": client_id,
                "encounter_id": encounter_id,
                "doctor_role_id": "therapist",
                "doctor_name": "Терапевт",
                "fields_json": {"diagnosis": "Клинически здоров", "mkb10": "Z00.0"},
                "is_completed": True,
            },
        )
        assert status == 200, (status, exam)

        status, doctor_statuses = request("GET", f"/dashboard/client-doctor-statuses?client_ids={client_id}")
        assert status == 200 and isinstance(doctor_statuses, list) and len(doctor_statuses) == 1, (
            status,
            doctor_statuses,
        )
        doctor_status = doctor_statuses[0]
        assert doctor_status["client_id"] == client_id and doctor_status["encounter_id"] == encounter_id, doctor_status
        assert doctor_status["encounter_status"] == "draft", doctor_status
        assert any(item["service_id"] == service_id for item in doctor_status["services"]), doctor_status
        assert "therapist" in doctor_status["completed_doctor_role_ids"], doctor_status

        status, templates = request("GET", "/documents/templates")
        assert status == 200 and templates, (status, templates)
        template_id = next((item["id"] for item in templates if item["template_type"] == "docx"), templates[0]["id"])
        status, document = request(
            "POST",
            "/documents/generate",
            {"template_id": template_id, "client_id": client_id, "encounter_id": encounter_id},
        )
        assert status == 200, (status, document)
        generated_file = document["output_file_name"]
        generated_document_id = document.get("generated_document_id")

        download_url = f"{API}/documents/generated/{urllib.parse.quote(generated_file)}"
        with urllib.request.urlopen(download_url, timeout=30) as response:
            assert response.status == 200 and response.read(4), response.status

        status, generated_documents = request("GET", f"/generated-documents?client_id={client_id}&encounter_id={encounter_id}")
        assert status == 200 and isinstance(generated_documents, list) and len(generated_documents) > 0, (
            status,
            generated_documents,
        )

        status, journal_entries = request("GET", f"/document-journals?client_id={client_id}")
        assert status == 200 and isinstance(journal_entries, list), (status, journal_entries)

        status, medical_records = request("GET", f"/medical-records?client_id={client_id}")
        assert status == 200 and isinstance(medical_records, list) and len(medical_records) > 0, (
            status,
            medical_records,
        )

        status, medical_record_entries = request(
            "GET", f"/medical-records/entries?medical_record_id={medical_records[0]['id']}"
        )
        assert status == 200 and isinstance(medical_record_entries, list), (status, medical_record_entries)

        status, patient_consents = request("GET", f"/patient-consents?client_id={client_id}")
        assert status == 200 and isinstance(patient_consents, list), (status, patient_consents)

        Path(document["output_file_path"]).unlink(missing_ok=True)
        print(
            {
                "health": "ok",
                "search_results": len(clients),
                "services": len(services),
                "client_id": client_id,
                "duplicate_status": duplicate_status,
                "encounter_id": encounter_id,
                "doctor_exam_id": exam["id"],
                "dashboard_doctor_statuses": len(doctor_statuses),
                "generated_document_id": generated_document_id,
                "journal_entries": len(journal_entries),
                "medical_records": len(medical_records),
                "medical_record_entries": len(medical_record_entries),
                "patient_consents": len(patient_consents),
                "generated_file": generated_file,
            }
        )
    finally:
        cleanup(client_id)


if __name__ == "__main__":
    main()
