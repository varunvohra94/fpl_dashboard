variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "fpl_league_id" {
  description = "FPL League ID"
  type        = number
  default     = 944559
}

variable "min_instances" {
  description = "Minimum instances for Cloud Run (0 for scale to zero)"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum instances for Cloud Run (cost cap)"
  type        = number
  default     = 2
}

variable "backend_cpu" {
  description = "CPU allocation for Backend"
  type        = string
  default     = "1"
}

variable "backend_memory" {
  description = "Memory allocation for Backend"
  type        = string
  default     = "512Mi"
}

variable "frontend_cpu" {
  description = "CPU allocation for Frontend"
  type        = string
  default     = "1"
}

variable "frontend_memory" {
  description = "Memory allocation for Frontend"
  type        = string
  default     = "512Mi"
}

variable "backend_sa_email" {
  description = "Backend Service Account Email"
  type        = string
}

variable "frontend_sa_email" {
  description = "Frontend Service Account Email"
  type        = string
}

variable "pipeline_sa_email" {
  description = "Pipeline Service Account Email"
  type        = string
}

variable "scheduler_sa_email" {
  description = "Scheduler Service Account Email"
  type        = string
}

variable "vpc_connector_id" {
  description = "VPC Access Connector ID"
  type        = string
}

variable "instance_connection_name" {
  description = "Cloud SQL instance connection name"
  type        = string
}

variable "secret_database_url_id" {
  description = "Secret ID for async DATABASE_URL"
  type        = string
}

variable "secret_sync_database_url_id" {
  description = "Secret ID for sync SYNC_DATABASE_URL"
  type        = string
}

variable "backend_image" {
  description = "Docker image for Backend"
  type        = string
  default     = ""
}

variable "frontend_image" {
  description = "Docker image for Frontend"
  type        = string
  default     = ""
}

variable "pipeline_image" {
  description = "Docker image for Data Pipeline"
  type        = string
  default     = ""
}
