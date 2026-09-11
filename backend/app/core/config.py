"""Application configuration module."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Project metadata
    PROJECT_NAME: str = "FPL Rival Intelligence API"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # CORS settings
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*",
    ]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://fpl_user:fpl_password@localhost:5432/fpl_db"
    SYNC_DATABASE_URL: str = "postgresql://fpl_user:fpl_password@localhost:5432/fpl_db"

    # FPL Settings
    FPL_LEAGUE_ID: int = 944559
    FPL_API_BASE_URL: str = "https://fantasy.premierleague.com/api/"


settings = Settings()
