from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "MedCenters API"
    app_env: str = "dev"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "postgresql+psycopg://medcenters:medcenters@localhost:5432/medcenters"
    frontend_origin: str = "http://localhost:5173"
    generated_documents_dir: str = "storage/generated"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


settings = Settings()
