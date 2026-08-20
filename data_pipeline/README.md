# Data Pipeline Engine

FPL API data extraction, hourly polling, and batch ETL jobs.

## Tech Stack & Responsibilities
- FPL API ingestion (`/bootstrap-static/`, `/entry/{id}/`, `/leagues-classic/{id}/standings/`)
- Hourly status polling via Cloud Scheduler / Cloud Functions
- Rolling 3-game average score computation and metrics processing
- PostgreSQL ingestion with idempotency and transaction safety
