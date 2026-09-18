output "backend_sa_email" {
  description = "Backend API Service Account Email"
  value       = google_service_account.backend.email
}

output "pipeline_sa_email" {
  description = "Pipeline Engine Service Account Email"
  value       = google_service_account.pipeline.email
}

output "frontend_sa_email" {
  description = "Frontend UI Service Account Email"
  value       = google_service_account.frontend.email
}

output "scheduler_sa_email" {
  description = "Cloud Scheduler Service Account Email"
  value       = google_service_account.scheduler.email
}
