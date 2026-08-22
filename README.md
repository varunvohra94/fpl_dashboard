# ⚽ FPL League Platform

A bespoke Fantasy Premier League (FPL) web dashboard and analytics platform designed for private mini-leagues.

---

## 🌟 Core Features

- **Post-Deadline Rival News Feed:** Track real-time manager transfers, captaincy choices, and chip usage (Wildcard, Free Hit, Bench Boost, Triple Captain).
- **Custom Standings Table:** Standings enhanced with net scores (after transfer hits) and rolling 3-game average form indicators.
- **Dynamic Rank Visualizations:** Animated historical rank fluctuations and bar chart races.
- **Automated Data Engine:** Scheduled polling of the official FPL API with idempotency and duplicate run protection.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Responsibilities |
| :--- | :--- | :--- |
| **Frontend** | Next.js (React), Tailwind CSS | Mobile-first responsive UI, transfers feed, standings |
| **Backend** | FastAPI, SQLAlchemy 2.0 Async, `asyncpg` | REST API, async database access, metrics calculation |
| **Data Pipeline** | Python (`httpx`, `asyncio`), Cloud Scheduler | FPL API ingestion, hourly status polling, batch ETL |
| **Database** | PostgreSQL 16 | Relational data persistence, integrity constraints |
| **Package Manager** | `uv` | Fast, deterministic Python dependency management |
| **Infrastructure** | Terraform, GCP (Cloud Run, Cloud SQL, Artifact Registry) | Declarative cloud resource provisioning |

---

## 🚀 Quickstart (Local Development)

### 1. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```

### 2. Start PostgreSQL Database
Start the local PostgreSQL container (which automatically provisions the schema via `infrastructure/sql/init.sql`):
```bash
docker compose up -d postgres
```

Verify container status:
```bash
docker compose ps
```

### 3. Setup & Test Backend
```bash
cd backend
uv sync
uv run python test_db_integration.py
```

---

## 📚 Documentation

- [Roadmap & Implementation Blueprint](docs/ROADMAP.md)
- [Database Schema & Core Data Model Architecture](docs/architecture/database-schema-and-core-data-model.md)
- [Master Monorepo Instructions](.agent/INSTRUCTIONS.md)
