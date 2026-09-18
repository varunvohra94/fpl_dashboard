#!/usr/bin/env bash
# ==============================================================================
# FPL Mini-League Intelligence Platform - Test Environment Orchestrator
# ==============================================================================

set -eo pipefail

# ANSI color codes for rich terminal styling
BOLD='\033[1m'
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
MAGENTA='\033[1;35m'
BLUE='\033[1;34m'
NC='\033[0m' # No Color

# Workspace root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}${BOLD}╔════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║   ⚽  FPL Mini-League Intelligence Platform — Testing Environment      ║${NC}"
echo -e "${CYAN}${BOLD}╚════════════════════════════════════════════════════════════════════════╝${NC}\n"

# 1. Check prerequisites
echo -e "${BLUE}▶ [1/5] Checking prerequisites...${NC}"

if ! command -v docker &>/dev/null; then
    echo -e "${RED}❌ Error: 'docker' is not installed or not in PATH.${NC}"
    exit 1
fi

if ! docker info &>/dev/null; then
    echo -e "${RED}❌ Error: Docker daemon is not running. Please start Docker Desktop and retry.${NC}"
    exit 1
fi

if ! command -v uv &>/dev/null; then
    echo -e "${RED}❌ Error: 'uv' (Python package manager) is not installed.${NC}"
    echo -e "${YELLOW}   Install it via: curl -LsSf https://astral.sh/uv/install.sh | sh${NC}"
    exit 1
fi

if ! command -v npm &>/dev/null; then
    echo -e "${RED}❌ Error: 'npm' is not installed or not in PATH.${NC}"
    exit 1
fi

# Ensure .env file exists
if [ ! -f "$ROOT_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating .env from .env.example...${NC}"
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
fi

# Source .env for local script variables if needed
if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env" 2>/dev/null || true
    set +a
fi

DB_USER="${POSTGRES_USER:-fpl_user}"
DB_NAME="${POSTGRES_DB:-fpl_db}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

# 2. Check for port conflicts and clear if desired
clean_port() {
    local port=$1
    local pids
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}⚠️  Port $port is currently occupied by PID(s): $pids. Terminating old process...${NC}"
        # shellcheck disable=SC2086
        kill -9 $pids 2>/dev/null || true
        sleep 1
    fi
}

clean_port "$BACKEND_PORT"
clean_port "$FRONTEND_PORT"

# 3. Start PostgreSQL Docker container
echo -e "\n${BLUE}▶ [2/5] Starting PostgreSQL database container...${NC}"
docker compose up -d postgres

# 4. Wait for PostgreSQL readiness
echo -e "\n${BLUE}▶ [3/5] Verifying database connectivity...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
DB_READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker compose exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null; then
        DB_READY=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -e "   ⏳ Waiting for PostgreSQL to be ready... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done

if [ "$DB_READY" = false ]; then
    echo -e "${RED}❌ Error: Timed out waiting for PostgreSQL to start.${NC}"
    docker compose logs postgres
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL is ready and accepting connections!${NC}"

# 5. Ingest / Seed Data into PostgreSQL
echo -e "\n${BLUE}▶ [4/5] Loading & seeding FPL data into PostgreSQL...${NC}"
echo -e "${CYAN}   Running Data Pipeline (Bootstrap & Gameweek Backfill)...${NC}"
(
    cd "$ROOT_DIR/data_pipeline"
    uv run python -m src.main --mode=backfill
)
echo -e "${GREEN}✅ Database data ingestion complete!${NC}"

# 6. Spin up Backend API and Frontend UI
echo -e "\n${BLUE}▶ [5/5] Spinning up FastAPI Backend and Next.js Frontend...${NC}"

# Process tracking and clean shutdown trap
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo -e "\n\n${YELLOW}🛑 Shutting down testing environment...${NC}"
    if [ -n "$BACKEND_PID" ]; then
        echo -e "   Stopping Backend API (PID: $BACKEND_PID)..."
        kill -TERM "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "   Stopping Frontend UI (PID: $FRONTEND_PID)..."
        kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    fi
    # Wait briefly for graceful termination
    sleep 1
    # Force kill if still hanging
    if [ -n "$BACKEND_PID" ]; then kill -9 "$BACKEND_PID" 2>/dev/null || true; fi
    if [ -n "$FRONTEND_PID" ]; then kill -9 "$FRONTEND_PID" 2>/dev/null || true; fi
    echo -e "${GREEN}✅ All services stopped successfully.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start Backend API in background
(
    cd "$ROOT_DIR/backend"
    exec uv run uvicorn app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

# Wait for backend health endpoint to be ready
echo -e "   ⏳ Waiting for Backend API on http://localhost:$BACKEND_PORT/health..."
BACKEND_HEALTHY=false
for i in $(seq 1 20); do
    if curl -sf "http://localhost:$BACKEND_PORT/health" &>/dev/null; then
        BACKEND_HEALTHY=true
        break
    fi
    sleep 0.5
done

if [ "$BACKEND_HEALTHY" = true ]; then
    echo -e "${GREEN}   ✅ Backend API is active and healthy!${NC}"
else
    echo -e "${YELLOW}   ⚠️ Backend API is starting up...${NC}"
fi

# Start Frontend Next.js Dev Server in background
(
    cd "$ROOT_DIR/frontend"
    exec npm run dev -- -p "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

# Wait for frontend port to be bound
sleep 2

# Output prominent user banner with links
echo -e "\n"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}🚀  FPL Intelligence Platform Test Environment is LIVE & READY!         ${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════════════${NC}"
echo -e ""
echo -e "   ${BOLD}🌐 Frontend Web UI:${NC}    ${CYAN}${BOLD}http://localhost:${FRONTEND_PORT}${NC}"
echo -e "   ${BOLD}📚 Backend API Docs:${NC}   ${MAGENTA}${BOLD}http://localhost:${BACKEND_PORT}/docs${NC}"
echo -e "   ${BOLD}🩺 API Health Check:${NC}   ${BLUE}${BOLD}http://localhost:${BACKEND_PORT}/health${NC}"
echo -e "   ${BOLD}📊 PostgreSQL Host:${NC}    ${YELLOW}localhost:5432 (${DB_NAME})${NC}"
echo -e ""
echo -e "   ${BOLD}👉 Click the link above or visit http://localhost:${FRONTEND_PORT} in your browser.${NC}"
echo -e "   ${BOLD}💡 Press [Ctrl + C] at any time to gracefully stop all services.${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════════════════════${NC}\n"

# Wait for both background processes
wait "$BACKEND_PID" "$FRONTEND_PID"
