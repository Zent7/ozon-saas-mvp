from fastapi import FastAPI

def create_app() -> FastAPI:
    app = FastAPI(title="Ozon SaaS")

    # позже тут будет подключение роутеров:
    # from app.api.v1.router import api_router
    # app.include_router(api_router, prefix="/api/v1")

    return app