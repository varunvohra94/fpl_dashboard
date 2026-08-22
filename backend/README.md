# Backend API Service

FastAPI service and asynchronous SQLAlchemy 2.0 database layer for the Fantasy Premier League (FPL) Mini-League platform.

---

## 🛠️ Tech Stack & Tooling

- **Language:** Python 3.11+
- **Package Manager:** [`uv`](https://github.com/astral-sh/uv) (strictly managed via `pyproject.toml` and `uv.lock`)
- **API Framework:** FastAPI
- **Database Layer:** SQLAlchemy 2.0 (Asynchronous ORM with modern `Mapped` typing)
- **Database Driver:** `asyncpg` (high-performance async PostgreSQL driver) & `psycopg2-binary`
- **Configuration & Validation:** Pydantic v2 & `pydantic-settings`
- **Linting & Formatting:** Ruff
- **Type Checking:** Mypy (strict mode)

---

## 📁 Directory Structure

```
backend/
├── app/
│   ├── core/
│   │   └── config.py        # Pydantic BaseSettings loading from .env
│   ├── db/
│   │   ├── base.py          # DeclarativeBase and TimestampMixin
│   │   └── session.py       # Async SQLAlchemy engine & async_session_maker
│   └── models/              # SQLAlchemy 2.0 Async Models
│       ├── element.py       # FPL Player reference table
│       ├── gameweek_score.py# Gameweek performance & rolling 3-game metrics
│       ├── manager.py       # Mini-league participants & team details
│       ├── pipeline_metadata.py # Pipeline run status & gameweek state
│       ├── team.py          # Premier League clubs
│       └── transfer.py      # Manager transfer audit trail
├── pyproject.toml           # Project dependencies and tool configurations
├── uv.lock                  # Deterministic dependency lockfile
└── test_db_integration.py   # Async database CRUD verification script
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have `uv` installed and the PostgreSQL container running from the monorepo root:
```bash
# From repository root
docker compose up -d postgres
```

### 2. Install Dependencies
```bash
cd backend
uv sync
```

### 3. Run Database Integration Test
Verify asynchronous connection, schema constraints, and model CRUD operations:
```bash
uv run python test_db_integration.py
```

### 4. Code Quality & Linting
Run Ruff to check formatting and linting:
```bash
uv run ruff check .
uv run ruff format .
```
