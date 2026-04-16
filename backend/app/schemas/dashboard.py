from pydantic import BaseModel


class DashboardStats(BaseModel):
    clients_count: int
    encounters_count: int
    services_count: int
    recalls_due_count: int
