output "backend_sa_email" {
  description = "Backend API Service Account Email"
  value       = google_service_account.backend.email
  depends_on = [
    google_project_iam_member.backend_cloudsql,
    google_project_iam_member.backend_secret_accessor,
    google_project_iam_member.backend_log_writer,
  ]
}

output "pipeline_sa_email" {
  description = "Pipeline Engine Service Account Email"
  value       = google_service_account.pipeline.email
  depends_on = [
    google_project_iam_member.pipeline_cloudsql,
    google_project_iam_member.pipeline_secret_accessor,
    google_project_iam_member.pipeline_log_writer,
  ]
}

output "frontend_sa_email" {
  description = "Frontend UI Service Account Email"
  value       = google_service_account.frontend.email
  depends_on = [
    google_project_iam_member.frontend_log_writer,
  ]
}

output "scheduler_sa_email" {
  description = "Cloud Scheduler Service Account Email"
  value       = google_service_account.scheduler.email
  depends_on = [
    google_project_iam_member.scheduler_run_invoker,
  ]
}
