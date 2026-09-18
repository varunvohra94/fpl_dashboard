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

All cloud resources are defined declaratively in [`infrastructure/terraform/`](./terraform/) targeting Google Cloud Platform:

### Architecture Components

| Component | GCP Service | Configuration & Sizing |
| :--- | :--- | :--- |
| **Backend API** | Cloud Run (`fpl-backend`) | Serverless FastAPI (`min_instances = 0`, `max_instances = 2`, `512Mi` RAM) |
| **Frontend UI** | Cloud Run (`fpl-frontend`) | Serverless Next.js Standalone (`min_instances = 0`, `max_instances = 2`, `512Mi` RAM) |
| **Batch Pipeline** | Cloud Run Job (`fpl-pipeline-job`) | On-demand ETL container execution for matchday finalization |
| **Hourly Poller** | Cloud Scheduler (`fpl-pipeline-hourly-poller`) | Cron `0 * * * *` triggering Cloud Run Job via OIDC authentication |
| **Database** | Cloud SQL for PostgreSQL 16 | PostgreSQL 16 on private VPC subnet with automated daily backups |
| **Container Registry** | Artifact Registry (`fpl-images`) | Regional Docker repository for container images |
| **Secrets Engine** | Secret Manager | Zero-plaintext credentials (`db-password`, `database-url`, `sync-database-url`) |
| **CI/CD Access** | Workload Identity Federation (WIF) | Keyless GitHub Actions OIDC impersonation (`varunvohra94/fpl_dashboard`) |

---

### 🚀 One-Time GCP Bootstrap

Before applying Terraform for the first time, execute the bootstrap script from the repository root:

```bash
./scripts/bootstrap-gcp.sh
```

This script automatically:
1. Enables required Google Cloud APIs (`run`, `sqladmin`, `secretmanager`, `artifactregistry`, `iam`, etc.).
2. Creates the GCS bucket (`gs://fpl-league-dashboard-prod-tfstate`) with Object Versioning enabled.
3. Provisions the Workload Identity Pool and Provider for GitHub Actions.
4. Generates the deployment Service Account (`github-actions-deployer`) with least-privilege IAM roles.

---

### 🛠️ Terraform Directory Layout

```
infrastructure/terraform/
├── main.tf                    # Root orchestration module
├── variables.tf               # Input parameters and cost-optimized defaults
├── terraform.tfvars.example   # Sample variable values
├── versions.tf                # Provider versions and GCS remote backend
├── outputs.tf                 # Exported endpoints, URLs, and connection strings
└── modules/
    ├── artifact_registry/     # Docker image repository
    ├── database/              # Cloud SQL Postgres 16 & Secret Manager secrets
    ├── iam/                   # Dedicated least-privilege service accounts
    ├── networking/            # VPC, Private IP Peering & Serverless VPC Connector
    └── services/              # Cloud Run Services, Cloud Run Job & Cloud Scheduler
```
