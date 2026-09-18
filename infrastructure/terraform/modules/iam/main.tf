# ==============================================================================
# Service Account: Backend API (FastAPI)
# ==============================================================================
resource "google_service_account" "backend" {
  account_id   = "sa-fpl-backend"
  display_name = "FPL Backend API Service Account"
  description  = "Assigned to Cloud Run FastAPI backend with least-privilege database & secret access"
}

resource "google_project_iam_member" "backend_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "backend_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

# ==============================================================================
# Service Account: Data Ingestion Pipeline & Poller (Cloud Run Job)
# ==============================================================================
resource "google_service_account" "pipeline" {
  account_id   = "sa-fpl-pipeline"
  display_name = "FPL Data Pipeline Engine Service Account"
  description  = "Assigned to Cloud Run Data Pipeline Job for ETL batch processing"
}

resource "google_project_iam_member" "pipeline_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.pipeline.email}"
}

resource "google_project_iam_member" "pipeline_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.pipeline.email}"
}

resource "google_project_iam_member" "pipeline_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.pipeline.email}"
}

# ==============================================================================
# Service Account: Frontend UI (Next.js)
# ==============================================================================
resource "google_service_account" "frontend" {
  account_id   = "sa-fpl-frontend"
  display_name = "FPL Frontend Web UI Service Account"
  description  = "Assigned to Cloud Run Next.js frontend service"
}

resource "google_project_iam_member" "frontend_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.frontend.email}"
}

# ==============================================================================
# Service Account: Cloud Scheduler (Invokes Cloud Run Pipeline Job)
# ==============================================================================
resource "google_service_account" "scheduler" {
  account_id   = "sa-fpl-scheduler"
  display_name = "FPL Cloud Scheduler Service Account"
  description  = "Used by Cloud Scheduler to trigger Cloud Run pipeline jobs securely via OIDC"
}

resource "google_project_iam_member" "scheduler_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.scheduler.email}"
}
