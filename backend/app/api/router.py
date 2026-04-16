from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.client_documents import router as client_documents_router
from app.api.v1.routes.clients import router as clients_router
from app.api.v1.routes.dashboard import router as dashboard_router
from app.api.v1.routes.documents import router as documents_router
from app.api.v1.routes.encounters import router as encounters_router
from app.api.v1.routes.encounter_services import router as encounter_services_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.payments import router as payments_router
from app.api.v1.routes.recalls import router as recalls_router
from app.api.v1.routes.services import router as services_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(health_router, tags=["health"])
api_router.include_router(clients_router, prefix="/clients", tags=["clients"])
api_router.include_router(client_documents_router, prefix="/client-documents", tags=["client-documents"])
api_router.include_router(encounters_router, prefix="/encounters", tags=["encounters"])
api_router.include_router(encounter_services_router, prefix="/encounter-services", tags=["encounter-services"])
api_router.include_router(payments_router, prefix="/payments", tags=["payments"])
api_router.include_router(services_router, prefix="/services", tags=["services"])
api_router.include_router(documents_router, prefix="/documents", tags=["documents"])
api_router.include_router(recalls_router, prefix="/recalls", tags=["recalls"])
