"""Main FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.api import api_router
from app.core.config import settings
from app.db.session import engine, get_db

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown event lifecycle."""
    logger.info(f"Starting {settings.PROJECT_NAME} in {settings.ENVIRONMENT} mode...")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="High-performance REST API service for the FPL Mini-League Rival Intelligence Platform.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Configuration for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health & System"])
async def root() -> dict[str, Any]:
    """Welcome and API documentation link."""
    return {
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "documentation": "/docs",
        "version": "1.0.0",
        "api_v1": settings.API_V1_PREFIX,
    }


@app.get("/health", tags=["Health & System"])
@app.get("/api/v1/health", tags=["Health & System"])
async def health_check(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    """Healthcheck endpoint verifying application and database connectivity."""
    try:
        await db.execute(select(1))
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "healthy",
                "database": "connected",
                "environment": settings.ENVIRONMENT,
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Healthcheck database connection error: {exc}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(exc),
            },
        )


# Include Version 1 REST API routers
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
