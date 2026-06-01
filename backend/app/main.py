from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api.router import api_router
from app.core.config import settings
from app.db.init_db import init_db


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.frontend_origin,
            settings.public_frontend_origin,
            "http://127.0.0.1:5173",
        ],
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    @app.get("/health", tags=["health"])
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/test-documents", include_in_schema=False)
    def document_test_page() -> FileResponse:
        page_path = Path(__file__).resolve().parent / "static" / "document_test.html"
        return FileResponse(page_path)

    @app.on_event("startup")
    def on_startup() -> None:
        init_db()

    return app


app = create_application()
