resource "google_artifact_registry_repository" "repo" {
  location      = var.region
  repository_id = var.repository_id
  description   = "Docker container repository for FPL League Platform services"
  format        = "DOCKER"

  labels = {
    environment = var.environment
    managed-by  = "terraform"
  }
}
