from fastapi import APIRouter
from app.api.v1.sellers import router as sellers_router
from app.api.v1.reports import router as reports_router
from app.api.v1.sales import router as sales_router 
api_router = APIRouter()

api_router.include_router(sellers_router)
api_router.include_router(reports_router)
api_router.include_router(sales_router)  