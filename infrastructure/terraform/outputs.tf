# ==============================================================================
# FPL Platform - Root Terraform Outputs
# ==============================================================================

output "artifact_registry_url" {
  description = "Artifact Registry Docker repository base URL"
  value       = module.artifact_registry.repository_url
}

output "cloudsql_instance_connection_name" {
  description = "Cloud SQL Instance connection name"
  value       = module.database.instance_connection_name
}

output "cloudsql_private_ip" {
  description = "Cloud SQL Private IP address"
  value       = module.database.private_ip_address
}

output "backend_api_url" {
  description = "Public URL for the FastAPI Backend Service"
  value       = module.services.backend_url
}

output "frontend_dashboard_url" {
  description = "Public URL for the Next.js Frontend Web Dashboard"
  value       = module.services.frontend_url
}

output "pipeline_job_name" {
  description = "Cloud Run Data Pipeline Job Name"
  value       = module.services.pipeline_job_name
}

output "scheduler_job_name" {
  description = "Cloud Scheduler Hourly Poller Job Name"
  value       = module.services.scheduler_job_name
}
