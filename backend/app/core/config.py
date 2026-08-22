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
    PROJECT_NAME: str = "FPL League Platform API"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://fpl_user:fpl_password@localhost:5432/fpl_db"
    SYNC_DATABASE_URL: str = "postgresql://fpl_user:fpl_password@localhost:5432/fpl_db"

    # FPL Settings
    FPL_LEAGUE_ID: int = 944559
    FPL_API_BASE_URL: str = "https://fantasy.premierleague.com/api/"


settings = Settings()
