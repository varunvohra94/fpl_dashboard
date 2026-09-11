# Backend API Service

FastAPI REST API service and asynchronous SQLAlchemy 2.0 database layer for the Fantasy Premier League (FPL) Mini-League Rival Intelligence platform.

---

## 🛠️ Tech Stack & Tooling

- **Language:** Python 3.11+
- **Package Manager:** [`uv`](https://github.com/astral-sh/uv) (strictly managed via `pyproject.toml` and `uv.lock`)
- **API Framework:** FastAPI
- **Database Layer:** SQLAlchemy 2.0 (Asynchronous ORM with modern `Mapped` typing)
- **Database Driver:** `asyncpg` (high-performance async PostgreSQL driver) & `psycopg2-binary`
- **Validation & Serialization:** Pydantic v2 & `pydantic-settings`
- **Containerization:** Multi-stage Dockerfile powered by `uv`
- **Testing:** `pytest` + `pytest-asyncio` + `httpx` with `NullPool` isolation
- **Linting & Formatting:** Ruff

---

## 📁 Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── gameweeks.py # Pipeline state machine & GW status
│   │       │   ├── league.py    # Custom Standings & Rival Transfer Feed
│   │       │   ├── managers.py  # Manager profile, history & chips
│   │       │   └── players.py   # Top PL matchday performances (xG, xA, ICT)
│   │       └── api.py           # v1 APIRouter aggregator
│   ├── core/
│   │   └── config.py            # Pydantic Settings loading from .env
│   ├── db/
│   │   ├── base.py              # DeclarativeBase and TimestampMixin
│   │   └── session.py           # Async engine & async_session_maker (get_db)
│   ├── models/                  # SQLAlchemy 2.0 Async Models
│   │   ├── element.py           # FPL Player reference table
│   │   ├── element_gameweek_history.py # Player matchday stats (xG, xA, Threat)
│   │   ├── gameweek_score.py    # Gameweek performance & rolling 3-game metrics
│   │   ├── manager.py           # Mini-league participants & team details
│   │   ├── pipeline_metadata.py # Pipeline run status & gameweek state
│   │   ├── team.py              # Premier League clubs
│   │   └── transfer.py          # Manager transfer audit trail
│   ├── schemas/                 # Pydantic v2 Response Models
│   │   ├── gameweeks.py         # GameweekState, PipelineStatusResponse
│   │   ├── managers.py          # ManagerProfileResponse, ManagerGameweekScore
│   │   ├── players.py           # PlayerPerformanceItem, TopPlayersResponse
│   │   ├── standings.py         # StandingsEntry, LeagueStandingsResponse
│   │   └── transfers.py         # TransferItem, LeagueTransfersResponse
│   └── main.py                  # FastAPI entrypoint, CORS, lifespan, /health
├── tests/
│   ├── conftest.py              # Async HTTP client fixture with NullPool db override
│   └── test_api_endpoints.py    # Complete integration test suite (9 tests)
├── Dockerfile                   # Multi-stage production container with uv
├── pyproject.toml               # Project dependencies and tool configurations
└── uv.lock                      # Deterministic dependency lockfile
```

---

## 🚀 REST API Endpoints

Interactive Swagger UI documentation is available at: `http://localhost:8000/docs`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` / `/api/v1/health` | Liveness and PostgreSQL database connectivity check |
| `GET` | `/api/v1/league/standings` | Mini-league table with net score, rolling 3-GW form, hits cost |
| `GET` | `/api/v1/league/transfers` | Rival transfer news feed for a gameweek with in/out players |
| `GET` | `/api/v1/managers/{id}/history` | Individual manager season scorecard, rolling averages, chip history |
| `GET` | `/api/v1/gameweeks/status` | Ingestion pipeline state machine across all 38 gameweeks |
| `GET` | `/api/v1/players/top` | Top Premier League player performances (goals, assists, xG, xA, ICT) |

---

## 💻 Local Development

### 1. Prerequisites
Ensure PostgreSQL is running:
```bash
docker compose up -d postgres
```

### 2. Install Dependencies
```bash
cd backend
uv sync
```

### 3. Run the Development Server
```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Run Automated Test Suite
```bash
uv run pytest -v
```

### 5. Linting and Formatting
```bash
uv run ruff check .
uv run ruff format .
```

---

## 🐳 Docker Deployment

### Build Container
```bash
docker build -t fpl-backend:latest -f Dockerfile .
```

### Run Container
```bash
docker run -d \
  -p 8000:8000 \
  --name fpl_backend \
  -e DATABASE_URL="postgresql+asyncpg://postgres:postgres@host.docker.internal:5432/fpl_db" \
  fpl-backend:latest
```
