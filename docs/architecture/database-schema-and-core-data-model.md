# Architecture & Component Audit: Database Layer & Core Data Models

> **Document Type:** Component Architecture & Verification Guide  
> **Status:** Implemented (Phase 2)  
> **Branch:** `feature/phase-2-database-schema`  
> **Framework:** [.agent/skills/component-explainer](file:///.agent/skills/component-explainer/SKILL.md)  

---

## 1. Executive Summary & Role in Architecture

### Problem Statement
The official Fantasy Premier League (FPL) API provides point-in-time JSON payloads for gameweek events, managers, and live fixtures. However:
1. It does not compute custom mini-league metrics like **rolling 3-game average form**, **running point totals**, or **net score deductions from transfer hits**.
2. It lacks a unified, historical timeline feed of rival transfers in a single queryable view.
3. Direct live requests from every frontend client to the official FPL API would quickly exhaust rate limits, cause high latency, and lead to poor user experience.

This component provides the **canonical persistence layer and relational data contract** for the entire platform. It models mini-league participants, manager gameweek scores, player weekly stats (xG, xA, rolling form), transfers, reference entities, and ETL pipeline execution states.

### Monorepo Architecture Topology
```
┌───────────────────────────────────────────────────────────┐
│                       Frontend (Next.js)                  │
└─────────────────────────────▲─────────────────────────────┘
                              │ HTTP REST / JSON
┌─────────────────────────────▼─────────────────────────────┐
│                      Backend (FastAPI)                    │
│   [app/models/]  ──►  [app/db/session.py] (SQLAlchemy 2.0) │
└─────────────────────────────▲─────────────────────────────┘
                              │ Asyncpg connection pool
┌─────────────────────────────▼─────────────────────────────┐
│                    PostgreSQL 16 Database                 │
│      [infrastructure/sql/init.sql] (Tables & Constraints) │
└─────────────────────────────▲─────────────────────────────┘
                              │ Writes batch metrics & running sums
┌─────────────────────────────┴─────────────────────────────┐
│                   Data Pipeline Engine (ETL)              │
│               [FPL Poller & Batch Processor]              │
└───────────────────────────────────────────────────────────┘
```

* **`infrastructure/sql/init.sql`**: Source-of-truth SQL DDL scripts for table provisioning in both local Docker Compose and future GCP Cloud SQL PostgreSQL instances.
* **`backend/app/models/`**: Asynchronous Python object-relational mapping (ORM) layer shared across the FastAPI backend and ETL jobs.
* **`docker-compose.yml`**: Isolates the database locally with healthchecks so developers don't incur Cloud SQL costs during development.

---

## 2. Under-the-Hood Mechanics & Data Flow

### Database Schema Table Specifications

| Table Name | Purpose & Key Columns | Constraints & Indexes |
| :--- | :--- | :--- |
| **`teams`** | Premier League clubs (`id`, `name`, `short_name`, `code`) | Primary Key on `id` |
| **`elements`** | FPL Player registry (`id`, `web_name`, `first_name`, `second_name`, `element_type`, `team_id`, `now_cost`) | Foreign Key -> `teams(id)` ON DELETE CASCADE, Indexes on `team_id`, `element_type` |
| **`element_gameweek_history`** | Weekly player performance (`minutes`, `points`, `xG`, `xA`, `rolling_3_points`, `metrics` JSONB) | Unique constraint on `(element_id, gameweek)`, GIN Index on `metrics` |
| **`managers`** | Mini-league participants (`id`/entry_id, `player_name`, `entry_name`, `fpl_league_id=944559`) | Index on `fpl_league_id` |
| **`gameweek_scores`** | Weekly manager performance (`points`, `event_transfers_cost`, `net_points`, `rank`, `bank`, `team_value`, `chip_used`, `rolling_3_avg`, `last_3_gw_total`, `metrics` JSONB) | Unique constraint on `(manager_id, gameweek)`, Indexes on `manager_id`, `gameweek`, `chip_used`, GIN Index on `metrics` |
| **`transfers`** | Post-deadline transfer audit log (`element_in_id`, `element_out_id`, prices, `transfer_time`) | Unique on `(manager_id, gameweek, element_in_id, element_out_id, transfer_time)` |
| **`pipeline_metadata`**| Gameweek completion and pipeline state (`finished`, `data_checked`, `pipeline_run_status`, timestamps) | Index on `pipeline_run_status` |

---

## 3. Extensible JSONB Metrics & Running Sums

Both `gameweek_scores` and `element_gameweek_history` feature a `metrics JSONB DEFAULT '{}'` column:
- **Running Sums:** Store running totals (e.g. `running_net_points`, `running_bench_points`, `running_captain_points`).
- **Dynamic Extensibility:** Calculate new custom statistics in the ETL engine without needing database schema migrations.
- **GIN Indexing:** Enables lightning-fast querying and filtering inside JSON fields in PostgreSQL.

---

## 4. Verification & Testing

### Test Execution Command
```bash
cd backend
uv run python test_db_integration.py
```
**Output:**
```
🚀 Running Async Database Integration Test (with JSONB Metrics & Player History)...
✅ Fetched Manager: Varun Vohra (Klopp's Kids)
✅ Fetched 2 gameweek score records.
   - GW1: Raw 75 pts, Cost -0 pts, Net 75 pts | Last 3 GW Total: 75 | JSONB Running Net: 75, Running Bench: 8
   - GW2: Raw 62 pts, Cost -4 pts, Net 58 pts | Last 3 GW Total: 133 | JSONB Running Net: 133, Running Bench: 14
✅ Fetched 2 player history records for Saka.
   - GW1: 12 pts, 90 mins | xG: 0.45, xA: 0.62 | JSONB Running Pts: 12
   - GW2: 8 pts, 85 mins | xG: 0.20, xA: 0.40 | JSONB Running Pts: 20
🎉 All database schema & model verification checks PASSED successfully!
```
