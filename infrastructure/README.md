# Infrastructure & Database Schema (IaC)

This directory contains declarative infrastructure configurations, database DDL initialization scripts, and cloud deployment manifests for the FPL League Platform.

---

## 🗄️ Database Schema (`infrastructure/sql/`)

The PostgreSQL relational schema is defined in [`infrastructure/sql/init.sql`](./sql/init.sql). It is automatically mounted into the local Docker container on first boot and serves as the baseline for GCP Cloud SQL migrations.

### Table Catalog

| Table | Purpose | Primary Constraints / Indexes |
| :--- | :--- | :--- |
| **`teams`** | Premier League clubs (`id`, `name`, `short_name`, `code`) | PK: `id` |
| **`elements`** | FPL Player registry (`id`, `web_name`, `element_type`, `team_id`, `now_cost`) | FK: `team_id`, Indexes: `team_id`, `element_type` |
| **`element_gameweek_history`** | Individual player match stats per GW (`minutes`, `points`, `xG`, `xA`, `rolling_3_points`, `metrics` JSONB) | Unique: `(element_id, gameweek)`, GIN Index on `metrics` |
| **`managers`** | Mini-league participants (`id`, `player_name`, `entry_name`, `fpl_league_id`) | Index: `fpl_league_id` (League: `944559`) |
| **`gameweek_scores`** | Weekly manager points, hits, rank, bank, `last_3_gw_total`, and extensible `metrics` JSONB (running sums, streaks) | Unique: `(manager_id, gameweek)`, GIN Index on `metrics` |
| **`transfers`** | Post-deadline manager transfer history (`element_in_id`, `element_out_id`, prices, `transfer_time`) | Unique: `(manager_id, gameweek, element_in_id, element_out_id, transfer_time)` |
| **`pipeline_metadata`**| Gameweek completion and ETL pipeline state (`finished`, `data_checked`, `pipeline_run_status`) | Index: `pipeline_run_status` |

---

## ☁️ Cloud Infrastructure (GCP & Terraform)

Upcoming Terraform modules will manage:
- **Cloud SQL for PostgreSQL:** Managed database instance with private IP and automated backups.
- **Cloud Run:** Serverless container execution for FastAPI backend (scaling to zero).
- **Artifact Registry:** Secure container repository for Docker images.
- **Cloud Scheduler & Cloud Functions:** Cadenced polling for FPL API status updates.
- **Secret Manager:** Zero-hardcoded credentials and connection string resolution.
