"""Configuration module for the Data Pipeline."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Locate workspace root .env
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE = ROOT_DIR / ".env"


class PipelineSettings(BaseSettings):
    """Pipeline settings loaded from environment or root .env file."""

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://fpl_user:fpl_password@localhost:5432/fpl_db"
    SYNC_DATABASE_URL: str = "postgresql://fpl_user:fpl_password@localhost:5432/fpl_db"

    # FPL Settings
    FPL_LEAGUE_ID: int = 944559
    FPL_API_BASE_URL: str = "https://fantasy.premierleague.com/api/"
    FPL_USER_AGENT: str = "FPL-Mini-League-Platform/1.0 (contact: admin@fpl-league.internal)"

    # HTTP Client Configuration
    HTTP_TIMEOUT_SECONDS: float = 30.0
    HTTP_MAX_RETRIES: int = 3
    HTTP_RETRY_BACKOFF: float = 1.0

    # Pipeline Run Settings
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"


settings = PipelineSettings()
