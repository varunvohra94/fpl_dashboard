# ==============================================================================
# FPL Data Pipeline Engine - Container Image
# ==============================================================================
FROM python:3.11-slim

WORKDIR /workspace

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy project files
COPY backend /workspace/backend
COPY data_pipeline /workspace/data_pipeline

WORKDIR /workspace/data_pipeline

# Install dependencies into container
RUN uv sync --frozen || uv sync

# Default command runs the scheduled poller
ENTRYPOINT ["uv", "run", "python", "-m", "src.main"]
CMD ["--mode=poll"]
