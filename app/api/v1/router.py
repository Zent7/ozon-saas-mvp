from fastapi import APIRouter

from app.api.v1.sellers import router as sellers_router
from app.api.v1.reports import router as reports_router
from app.api.v1.sales import router as sales_router
from app.api.routes.integrations_ozon import router as ozon_router

from app.api.v1.endpoints.ozon_stock_thresholds import (
    router as ozon_stock_thresholds_router,
)

from app.api.v1.endpoints.ozon_alerts import (
    router as ozon_alerts_router,
)

api_router = APIRouter()

api_router.include_router(sellers_router)
api_router.include_router(reports_router)
api_router.include_router(sales_router)

api_router.include_router(ozon_router)

api_router.include_router(
    ozon_stock_thresholds_router,
    prefix="/ozon",
    tags=["Ozon Thresholds"],
)

api_router.include_router(
    ozon_alerts_router,
    prefix="/ozon",
    tags=["Ozon Alerts"],
)