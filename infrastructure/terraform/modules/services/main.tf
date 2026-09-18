# ==============================================================================
# Cloud Run: Backend API Service (FastAPI)
# ==============================================================================
resource "google_cloud_run_v2_service" "backend" {
  name                = "fpl-backend"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = var.backend_sa_email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.instance_connection_name]
      }
    }

    containers {
      image = var.backend_image != "" ? var.backend_image : "gcr.io/cloudrun/hello"

      ports {
        container_port = 8000
      }

      resources {
        limits = {
          cpu    = var.backend_cpu
          memory = var.backend_memory
        }
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "FPL_LEAGUE_ID"
        value = tostring(var.fpl_league_id)
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_database_url_id
            version = "latest"
          }
        }
      }

      env {
        name = "SYNC_DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.secret_sync_database_url_id
            version = "latest"
          }
        }
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Allow unauthenticated public access to Backend REST API
resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  name     = google_cloud_run_v2_service.backend.name
  location = google_cloud_run_v2_service.backend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ==============================================================================
# Cloud Run: Frontend Web UI (Next.js)
# ==============================================================================
resource "google_cloud_run_v2_service" "frontend" {
  name                = "fpl-frontend"
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = var.frontend_sa_email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.frontend_image != "" ? var.frontend_image : "gcr.io/cloudrun/hello"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = var.frontend_cpu
          memory = var.frontend_memory
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "NEXT_PUBLIC_API_BASE_URL"
        value = "${google_cloud_run_v2_service.backend.uri}/api/v1"
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Allow unauthenticated public access to Frontend Web Dashboard
resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  name     = google_cloud_run_v2_service.frontend.name
  location = google_cloud_run_v2_service.frontend.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ==============================================================================
# Cloud Run Job: Data Pipeline & Batch Poller Engine
# ==============================================================================
resource "google_cloud_run_v2_job" "pipeline_job" {
  name                = "fpl-pipeline-job"
  location            = var.region
  deletion_protection = false

  template {
    template {
      service_account = var.pipeline_sa_email

      vpc_access {
        connector = var.vpc_connector_id
        egress    = "PRIVATE_RANGES_ONLY"
      }

      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [var.instance_connection_name]
        }
      }

      containers {
        image = var.pipeline_image != "" ? var.pipeline_image : "gcr.io/cloudrun/hello"
        args  = ["--mode=poll"]

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }

        env {
          name  = "ENVIRONMENT"
          value = var.environment
        }

        env {
          name  = "FPL_LEAGUE_ID"
          value = tostring(var.fpl_league_id)
        }

        env {
          name = "DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = var.secret_database_url_id
              version = "latest"
            }
          }
        }

        env {
          name = "SYNC_DATABASE_URL"
          value_source {
            secret_key_ref {
              secret  = var.secret_sync_database_url_id
              version = "latest"
            }
          }
        }
      }
    }
  }
}

# ==============================================================================
# Cloud Scheduler: Hourly Cadenced Poller Trigger
# ==============================================================================
resource "google_cloud_scheduler_job" "hourly_poller" {
  name        = "fpl-pipeline-hourly-poller"
  description = "Triggers the FPL Data Pipeline Cloud Run Job hourly to inspect and ingest completed gameweeks"
  schedule    = "0 * * * *"
  time_zone   = "UTC"
  region      = var.region

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.pipeline_job.name}:run"

    oauth_token {
      service_account_email = var.scheduler_sa_email
    }
  }
}
