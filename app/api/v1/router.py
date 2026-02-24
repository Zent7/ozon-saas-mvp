from fastapi import APIRouter
from app.api.v1.sellers import router as sellers_router

api_router = APIRouter()
api_router.include_router(sellers_router)