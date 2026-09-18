variable "region" {
  description = "GCP region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "network_id" {
  description = "VPC Network ID for Cloud SQL private IP connectivity"
  type        = string
}

variable "private_vpc_connection" {
  description = "Private VPC connection resource to establish dependency"
  type        = any
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "fpl_db"
}

variable "db_user" {
  description = "Database user"
  type        = string
  default     = "fpl_user"
}

variable "db_disk_size_gb" {
  description = "Initial disk size in GB"
  type        = number
  default     = 10
}
