from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.client import Client
from app.models.encounter import Encounter
from app.models.recall import Recall
from app.models.service import Service
from app.schemas.dashboard import DashboardStats

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)) -> DashboardStats:
    clients_count = db.scalar(select(func.count()).select_from(Client)) or 0
    encounters_count = db.scalar(select(func.count()).select_from(Encounter)) or 0
    services_count = db.scalar(select(func.count()).select_from(Service)) or 0
    recalls_due_count = (
        db.scalar(select(func.count()).select_from(Recall).where(Recall.planned_date <= date.today())) or 0
    )
    return DashboardStats(
        clients_count=clients_count,
        encounters_count=encounters_count,
        services_count=services_count,
        recalls_due_count=recalls_due_count,
    )
