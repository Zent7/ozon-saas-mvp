from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class ReportTotals(BaseModel):
    clients_count: int
    documents_count: int
    services_count: int
    revenue: Decimal


class ReportCenterSummary(ReportTotals):
    center_id: int
    center_code: str
    center_name: str


class DailySummaryReport(BaseModel):
    date_from: date
    date_to: date
    totals: ReportTotals
    centers: list[ReportCenterSummary]
