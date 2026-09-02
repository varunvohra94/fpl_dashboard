# 🔄 FPL Data Pipeline & Ingestion Engine

An asynchronous, resilient ETL pipeline that queries the official Fantasy Premier League (FPL) REST API, computes custom mini-league metrics (net scores, rolling 3-game average form, and JSONB running totals), and atomically persists data into PostgreSQL.

---

## 🏗️ Architecture & Segregated Layers

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Extraction: FPLClient (src/fpl_client.py)                           │
│    • Async HTTP requests with connection pooling (httpx)               │
│    • Auto-retries on transient 5xx & network errors with backoff       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Raw JSON Dictionaries
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. Transformation: DataTransformer (src/transformer.py)                │
│    • Pure Python business logic & metric calculation                   │
│    • Computes Net Points, Rolling 3-GW Averages, JSONB running sums    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Structured Typed Records
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. Loading: PipelineLoader (src/loader.py)                             │
│    • Async database transactions (SQLAlchemy 2.0 + asyncpg)            │
│    • PostgreSQL ON CONFLICT DO UPDATE upserts & idempotency           │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ Managed by
┌───────────────────────────────────┴────────────────────────────────────┐
│ 4. Orchestration: Poller & Main (src/poller.py & src/main.py)          │
│    • Automated polling checks for gameweek finalization (data_checked) │
│    • Prevents duplicate runs via pipeline_metadata state tracking      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart & Usage

### 1. Install Dependencies
```bash
cd data_pipeline
uv sync
```

### 2. Run Tests
```bash
# Run unit and integration tests
uv run pytest -v
```

### 3. CLI Execution Modes

#### Poller Mode (Default / Scheduled Execution)
Queries `/api/bootstrap-static/` and runs the ETL pipeline if a newly completed gameweek has been finalized (`data_checked == True`):
```bash
uv run python -m src.main --mode=poll
```

#### Bootstrap Sync
Syncs Premier League clubs (`teams`), player catalog (`elements`), and gameweek event flags (`pipeline_metadata`):
```bash
uv run python -m src.main --mode=bootstrap
```

#### Single Gameweek Ingestion
Ingests a specific gameweek for the configured mini-league:
```bash
uv run python -m src.main --mode=ingest --gw=3 --force
```

#### Historical Backfill
Iterates through all completed gameweeks of the current season and ingests them sequentially:
```bash
uv run python -m src.main --mode=backfill
```

---

## 🐳 Docker Deployment

Build the container image:
```bash
docker build -f data_pipeline/Dockerfile -t fpl-data-pipeline .
```

Run container:
```bash
docker run --env-file .env fpl-data-pipeline --mode=poll
```
