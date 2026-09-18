# ==============================================================================
# FPL Backend API Service - Container Image
# ==============================================================================
FROM python:3.11-slim

WORKDIR /workspace

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy backend package
COPY backend /workspace/backend

WORKDIR /workspace/backend

# Install dependencies into container
RUN uv sync --frozen || uv sync

ENV PORT=8000

# Default command starts Uvicorn ASGI server respecting PORT environment variable
CMD ["sh", "-c", "exec uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
