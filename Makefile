# ==============================================================================
# ⚽ FPL Mini-League Intelligence Platform - Makefile
# ==============================================================================

.PHONY: all help test-env start dev up docker-up docker-down docker-restart docker-logs \
        db-wait db-bootstrap db-backfill db-load db-seed db-reset \
        backend frontend data-pipeline install test test-backend test-pipeline \
        lint format clean stop down

# Colors for terminal styling
CYAN    := \033[1;36m
GREEN   := \033[1;32m
YELLOW  := \033[1;33m
BLUE    := \033[1;34m
MAGENTA := \033[1;35m
BOLD    := \033[1m
RESET   := \033[0m

# Load .env if present
ifneq (,$(wildcard .env))
    include .env
    export
endif

DB_USER ?= fpl_user
DB_NAME ?= fpl_db
BACKEND_PORT ?= 8000
FRONTEND_PORT ?= 3000

# ------------------------------------------------------------------------------
# Default Target: Display Help Menu
# ------------------------------------------------------------------------------
all: help

help:
	@echo ""
	@echo "$(CYAN)$(BOLD)╔════════════════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)$(BOLD)║          ⚽  FPL Mini-League Platform — Developer Command Menu          ║$(RESET)"
	@echo "$(CYAN)$(BOLD)╚════════════════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(BOLD)🚀 Primary Environment Targets:$(RESET)"
	@echo "  $(GREEN)make test-env$(RESET)        Start the complete test environment (Docker, DB Seed, UI & API)"
	@echo "  $(GREEN)make start$(RESET)           Alias for 'make test-env'"
	@echo "  $(GREEN)make dev$(RESET)             Alias for 'make test-env'"
	@echo "  $(GREEN)make stop$(RESET)            Stop all running services and Docker containers"
	@echo ""
	@echo "$(BOLD)🐳 Docker & Database Targets:$(RESET)"
	@echo "  $(BLUE)make docker-up$(RESET)       Start PostgreSQL container in background"
	@echo "  $(BLUE)make docker-down$(RESET)     Stop PostgreSQL container"
	@echo "  $(BLUE)make docker-restart$(RESET)  Restart PostgreSQL container"
	@echo "  $(BLUE)make docker-logs$(RESET)     Follow PostgreSQL container logs"
	@echo "  $(BLUE)make db-wait$(RESET)         Wait until PostgreSQL container is ready"
	@echo "  $(BLUE)make db-load$(RESET)         Bootstrap & Backfill FPL data into database"
	@echo "  $(BLUE)make db-bootstrap$(RESET)    Sync teams, elements & gameweek flags"
	@echo "  $(BLUE)make db-backfill$(RESET)     Backfill all completed gameweeks for the league"
	@echo "  $(BLUE)make db-reset$(RESET)        Re-apply database DDL schema (infrastructure/sql/init.sql)"
	@echo ""
	@echo "$(BOLD)💻 Standalone Service Targets:$(RESET)"
	@echo "  $(MAGENTA)make backend$(RESET)          Start FastAPI backend server (http://localhost:$(BACKEND_PORT))"
	@echo "  $(MAGENTA)make frontend$(RESET)         Start Next.js frontend dev server (http://localhost:$(FRONTEND_PORT))"
	@echo "  $(MAGENTA)make data-pipeline$(RESET)    Run FPL data ingestion poller"
	@echo ""
	@echo "$(BOLD)🧪 Testing & Quality Assurance:$(RESET)"
	@echo "  $(YELLOW)make install$(RESET)          Install/sync dependencies (backend, pipeline, frontend)"
	@echo "  $(YELLOW)make test$(RESET)             Run all unit and integration test suites"
	@echo "  $(YELLOW)make test-backend$(RESET)     Run backend pytest suite"
	@echo "  $(YELLOW)make test-pipeline$(RESET)    Run data pipeline pytest suite"
	@echo "  $(YELLOW)make lint$(RESET)             Run lint checks (Ruff & ESLint)"
	@echo "  $(YELLOW)make format$(RESET)           Format Python codebase with Ruff"
	@echo "  $(YELLOW)make clean$(RESET)            Clean cache and build artifacts"
	@echo ""

# ------------------------------------------------------------------------------
# 🚀 Full Testing Environment Orchestration
# ------------------------------------------------------------------------------
test-env:
	@./scripts/start-test-env.sh

start: test-env
dev: test-env
up: test-env

# ------------------------------------------------------------------------------
# 🐳 Docker & Database Management
# ------------------------------------------------------------------------------
docker-up:
	@echo "$(BLUE)🐳 Starting PostgreSQL container...$(RESET)"
	@docker compose up -d postgres

docker-down:
	@echo "$(BLUE)🛑 Stopping PostgreSQL container...$(RESET)"
	@docker compose down

docker-restart:
	@echo "$(BLUE)🔄 Restarting PostgreSQL container...$(RESET)"
	@docker compose restart postgres

docker-logs:
	@docker compose logs -f postgres

db-wait:
	@echo "$(BLUE)⏳ Waiting for PostgreSQL to be ready...$(RESET)"
	@for i in $$(seq 1 30); do \
		if docker compose exec -T postgres pg_isready -U $(DB_USER) -d $(DB_NAME) >/dev/null 2>&1; then \
			echo "$(GREEN)✅ PostgreSQL is ready and accepting connections!$(RESET)"; \
			exit 0; \
		fi; \
		echo "   Waiting for database... ($$i/30)"; \
		sleep 1; \
	done; \
	echo "$(YELLOW)❌ Timed out waiting for PostgreSQL to start.$(RESET)"; exit 1

db-bootstrap:
	@echo "$(CYAN)🔄 Syncing bootstrap data (teams, players, gameweeks)...$(RESET)"
	@cd data_pipeline && uv run python -m src.main --mode=bootstrap

db-backfill:
	@echo "$(CYAN)🔄 Ingesting and computing metrics for completed gameweeks...$(RESET)"
	@cd data_pipeline && uv run python -m src.main --mode=backfill

db-load: db-wait
	@echo "$(CYAN)🔄 Loading full FPL league dataset into PostgreSQL...$(RESET)"
	@cd data_pipeline && uv run python -m src.main --mode=backfill

db-seed: db-load

db-reset:
	@echo "$(YELLOW)⚠️ Resetting PostgreSQL schema from infrastructure/sql/init.sql...$(RESET)"
	@docker compose exec -T postgres psql -U $(DB_USER) -d $(DB_NAME) -f /docker-entrypoint-initdb.d/01-init.sql
	@echo "$(GREEN)✅ Database schema re-applied successfully.$(RESET)"

# ------------------------------------------------------------------------------
# 💻 Standalone Development Services
# ------------------------------------------------------------------------------
backend:
	@echo "$(MAGENTA)🚀 Starting FastAPI Backend on http://0.0.0.0:$(BACKEND_PORT)...$(RESET)"
	@cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port $(BACKEND_PORT)

frontend:
	@echo "$(MAGENTA)🌐 Starting Next.js Frontend on http://localhost:$(FRONTEND_PORT)...$(RESET)"
	@cd frontend && npm run dev -- -p $(FRONTEND_PORT)

data-pipeline:
	@echo "$(CYAN)🔄 Running Data Pipeline Poller...$(RESET)"
	@cd data_pipeline && uv run python -m src.main --mode=poll

# ------------------------------------------------------------------------------
# 🧪 Installation, Testing & Code Quality
# ------------------------------------------------------------------------------
install:
	@echo "$(BLUE)📦 Installing and syncing dependencies...$(RESET)"
	@echo "   Installing Backend dependencies..."
	@cd backend && uv sync
	@echo "   Installing Data Pipeline dependencies..."
	@cd data_pipeline && uv sync
	@echo "   Installing Frontend dependencies..."
	@cd frontend && npm install
	@echo "$(GREEN)✅ All dependencies installed successfully.$(RESET)"

test: test-backend test-pipeline
	@echo "$(GREEN)🎉 All test suites passed!$(RESET)"

test-backend:
	@echo "$(YELLOW)🧪 Running Backend test suite...$(RESET)"
	@cd backend && uv run pytest -v

test-pipeline:
	@echo "$(YELLOW)🧪 Running Data Pipeline test suite...$(RESET)"
	@cd data_pipeline && uv run pytest -v

lint:
	@echo "$(BLUE)🔍 Running Ruff linter on backend & data_pipeline...$(RESET)"
	@cd backend && uv run ruff check .
	@cd data_pipeline && uv run ruff check .
	@echo "$(GREEN)✅ Python linting passed.$(RESET)"

format:
	@echo "$(BLUE)🎨 Formatting Python codebase with Ruff...$(RESET)"
	@cd backend && uv run ruff format .
	@cd data_pipeline && uv run ruff format .
	@echo "$(GREEN)✅ Codebase formatted successfully.$(RESET)"

# ------------------------------------------------------------------------------
# 🧹 Teardown & Maintenance
# ------------------------------------------------------------------------------
stop:
	@echo "$(YELLOW)🛑 Stopping development servers on ports $(BACKEND_PORT) and $(FRONTEND_PORT)...$(RESET)"
	@-lsof -ti tcp:$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@-lsof -ti tcp:$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@echo "$(BLUE)🛑 Stopping Docker containers...$(RESET)"
	@docker compose down
	@echo "$(GREEN)✅ All services and containers stopped.$(RESET)"

down: stop

clean:
	@echo "$(YELLOW)🧹 Cleaning temporary build artifacts and caches...$(RESET)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@rm -rf frontend/.next 2>/dev/null || true
	@echo "$(GREEN)✅ Clean complete.$(RESET)"
