# ==============================================================================
# FPL Platform - Terraform Variables
# ==============================================================================

variable "project_id" {
  description = "The Google Cloud Platform Project ID"
  type        = string
  default     = "fpl-league-dashboard-prod"
}

variable "region" {
  description = "The primary GCP region for all infrastructure resources"
  type        = string
  default     = "us-east1"
}

variable "environment" {
  description = "Deployment environment name (e.g. production, staging)"
  type        = string
  default     = "production"
}

variable "fpl_league_id" {
  description = "Target Fantasy Premier League (FPL) Mini-League ID"
  type        = number
  default     = 944559
}

# ------------------------------------------------------------------------------
# Database Configuration
# ------------------------------------------------------------------------------

variable "db_tier" {
  description = "Cloud SQL machine tier (e.g. db-f1-micro, db-custom-1-3840)"
  type        = string
  default     = "db-f1-micro"
}

variable "db_name" {
  description = "PostgreSQL relational database name"
  type        = string
  default     = "fpl_db"
}

variable "db_user" {
  description = "PostgreSQL application database user"
  type        = string
  default     = "fpl_user"
}

variable "db_disk_size_gb" {
  description = "Initial storage disk size in GB for Cloud SQL instance"
  type        = number
  default     = 10
}

# ------------------------------------------------------------------------------
# Cloud Run & Scaling Parameters (Cost Optimization)
# ------------------------------------------------------------------------------

variable "min_instances" {
  description = "Minimum number of Cloud Run instances (set to 0 for scale-to-zero cost savings)"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of Cloud Run instances (capped to 2 for cost protection for ~10 concurrent users)"
  type        = number
  default     = 2
}

variable "backend_cpu" {
  description = "Cloud Run backend CPU allocation (e.g., '1' or '1000m')"
  type        = string
  default     = "1"
}

variable "backend_memory" {
  description = "Cloud Run backend memory allocation"
  type        = string
  default     = "512Mi"
}

variable "frontend_cpu" {
  description = "Cloud Run frontend CPU allocation"
  type        = string
  default     = "1"
}

variable "frontend_memory" {
  description = "Cloud Run frontend memory allocation"
  type        = string
  default     = "512Mi"
}

# ------------------------------------------------------------------------------
# Container Image Overrides (Provided by CI/CD)
# ------------------------------------------------------------------------------

variable "backend_image" {
  description = "Docker image URI for the FastAPI backend"
  type        = string
  default     = ""
}

variable "frontend_image" {
  description = "Docker image URI for the Next.js frontend"
  type        = string
  default     = ""
}

variable "pipeline_image" {
  description = "Docker image URI for the FPL Data Pipeline"
  type        = string
  default     = ""
}
