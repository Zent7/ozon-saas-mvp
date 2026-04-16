from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.center import Center
from app.models.client import Client
from app.models.client_document import ClientDocument
from app.models.document_template import DocumentTemplate
from app.models.encounter import Encounter
from app.models.encounter_service import EncounterService
from app.models.payment import Payment
from app.models.recall import Recall
from app.models.service import Service, ServiceCategory
from app.models.user import Role, User
from app.services.template_catalog import load_template_catalog


def seed_reference_data(db: Session) -> None:
    center_exists = db.execute(select(Center.id).limit(1)).scalar_one_or_none()
    if center_exists is not None:
        _backfill_related_records(db)
        return

    centers = [
        Center(code="center-a", name="Медцентр 1"),
        Center(code="center-b", name="Медцентр 2"),
    ]
    db.add_all(centers)

    roles = [
        Role(code="admin", name="Администратор", description="Полный доступ"),
        Role(code="registrar", name="Регистратор", description="Работа с клиентами и обращениями"),
    ]
    db.add_all(roles)
    db.flush()

    admin = User(
        center_id=centers[0].id,
        role_id=roles[0].id,
        login="admin",
        password_hash=hash_password("admin123"),
        full_name="Администратор системы",
        email="admin@example.com",
        is_active=True,
    )
    db.add(admin)

    category = ServiceCategory(code="base", name="Базовые услуги", sort_order=10)
    db.add(category)
    db.flush()

    services = [
        Service(code="spravka-driver", name="Справка водителя", price=Decimal("1500.00"), category_id=category.id),
        Service(code="spravka-pool", name="Справка в бассейн", price=Decimal("900.00"), category_id=category.id),
        Service(
            code="med-inspection",
            name="Медосмотр",
            price=Decimal("3500.00"),
            category_id=category.id,
            requires_sequence=True,
            recall_after_days=365,
        ),
    ]
    db.add_all(services)

    templates = [
        DocumentTemplate(
            code=item["code"],
            name=item["name"],
            file_name=item["file_name"],
            file_path=item["file_path"],
            description=item["description"],
            template_type=item["template_type"],
        )
        for item in load_template_catalog()
    ]
    db.add_all(templates)
    db.flush()

    clients = [
        Client(
            patient_number=1,
            last_name="Иванов",
            first_name="Иван",
            middle_name="Иванович",
            birth_date=date(1990, 5, 20),
            sex="M",
            phone="+79990000001",
            snils="111-111-111 11",
            created_by_user_id=admin.id,
        ),
        Client(
            patient_number=2,
            last_name="Петрова",
            first_name="Анна",
            middle_name="Сергеевна",
            birth_date=date(1988, 2, 14),
            sex="F",
            phone="+79990000002",
            created_by_user_id=admin.id,
        ),
    ]
    db.add_all(clients)
    db.flush()

    encounter = Encounter(
        center_id=centers[0].id,
        client_id=clients[0].id,
        created_by_user_id=admin.id,
        encounter_date=date.today(),
        payment_type="cash",
        total_amount=Decimal("1500.00"),
        comment="Первичный прием",
        status="completed",
    )
    db.add(encounter)
    db.flush()

    recall = Recall(
        client_id=clients[0].id,
        encounter_id=encounter.id,
        service_id=services[2].id,
        planned_date=date.today() + timedelta(days=30),
        status="planned",
        comment="Контрольный повтор",
    )
    db.add(recall)

    db.commit()
    _backfill_related_records(db)


def _backfill_related_records(db: Session) -> None:
    encounters = db.execute(select(Encounter)).scalars().all()
    services = db.execute(select(Service)).scalars().all()
    clients = db.execute(select(Client)).scalars().all()

    if encounters and services:
        for encounter in encounters:
            has_service = db.execute(
                select(EncounterService.id).where(EncounterService.encounter_id == encounter.id).limit(1)
            ).scalar_one_or_none()
            if has_service is None:
                primary_service = services[0]
                amount = encounter.total_amount or primary_service.price
                db.add(
                    EncounterService(
                        encounter_id=encounter.id,
                        service_id=primary_service.id,
                        quantity=1,
                        unit_price=amount,
                        line_total=amount,
                        sequence_number=f"{encounter.id:06d}",
                        notes="Автозаполнение стартовых данных",
                    )
                )

            has_payment = db.execute(
                select(Payment.id).where(Payment.encounter_id == encounter.id).limit(1)
            ).scalar_one_or_none()
            if has_payment is None:
                db.add(
                    Payment(
                        encounter_id=encounter.id,
                        payment_date=encounter.encounter_date,
                        payment_type=encounter.payment_type,
                        amount=encounter.total_amount,
                        status="paid",
                        comment="Первичный платеж",
                        created_by_user_id=encounter.created_by_user_id,
                    )
                )

    for client in clients:
        has_document = db.execute(
            select(ClientDocument.id).where(ClientDocument.client_id == client.id).limit(1)
        ).scalar_one_or_none()
        if has_document is None:
            db.add(
                ClientDocument(
                    client_id=client.id,
                    document_type="Паспорт РФ",
                    series="4000",
                    number=f"{client.id:06d}",
                    issued_by="ГУ МВД",
                    issued_at=client.birth_date,
                    notes="Автозаполненный документ клиента",
                )
            )

    db.commit()
