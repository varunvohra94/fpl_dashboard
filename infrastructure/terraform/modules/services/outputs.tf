output "backend_url" {
  description = "Public URL for Backend REST API"
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "Public URL for Frontend Web Dashboard"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "pipeline_job_name" {
  description = "Name of the Cloud Run Pipeline Job"
  value       = google_cloud_run_v2_job.pipeline_job.name
}

output "scheduler_job_name" {
  description = "Name of the Cloud Scheduler Job"
  value       = google_cloud_scheduler_job.hourly_poller.name
}
