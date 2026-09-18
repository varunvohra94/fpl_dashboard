variable "region" {
  description = "GCP region for Artifact Registry"
  type        = string
}

variable "repository_id" {
  description = "Repository name ID"
  type        = string
  default     = "fpl-images"
}

variable "environment" {
  description = "Environment label"
  type        = string
  default     = "production"
}
