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

## 🚀 Quickstart (Testing & Development Environment)

Spin up the entire stack (PostgreSQL Docker container, database bootstrap & backfill, FastAPI backend, and Next.js UI) with a single command:

```bash
make test-env
```

Once running, the test environment will automatically display the active URLs:
- 🌐 **Frontend Web UI:** `http://localhost:3000`
- 📚 **Interactive API Docs (Swagger):** `http://localhost:8000/docs`
- 🩺 **API Health Check:** `http://localhost:8000/health`

To stop all services and containers, simply press `Ctrl+C` or run:
```bash
make stop
```

---

## 🛠️ Makefile Command Reference

Run `make help` to view all available commands:

| Command | Description |
| :--- | :--- |
| `make test-env` / `make dev` | Start full testing environment (Docker, DB seed, UI & API) |
| `make stop` / `make down` | Stop all services and containers |
| `make docker-up` | Start PostgreSQL container in background |
| `make docker-down` | Stop PostgreSQL container |
| `make db-wait` | Wait until PostgreSQL is ready |
| `make db-load` | Run data pipeline bootstrap and backfill |
| `make db-reset` | Re-apply database schema from `infrastructure/sql/init.sql` |
| `make backend` | Start FastAPI backend standalone (`http://localhost:8000`) |
| `make frontend` | Start Next.js UI standalone (`http://localhost:3000`) |
| `make data-pipeline` | Run FPL data ingestion poller |
| `make install` | Install/sync dependencies across all packages (`uv` & `npm`) |
| `make test` | Run all test suites (`backend` and `data_pipeline`) |
| `make lint` | Run Ruff and ESLint checks |
| `make format` | Format Python codebase with Ruff |
| `make clean` | Remove caches and build artifacts |

---

## 📚 Documentation

- [Roadmap & Implementation Blueprint](docs/ROADMAP.md)
- [Database Schema & Core Data Model Architecture](docs/architecture/database-schema-and-core-data-model.md)
- [Database Entity-Relationship Diagram (ERD)](docs/architecture/entity-relationship-diagram.md)
- [Master Monorepo Instructions](.agent/INSTRUCTIONS.md)
