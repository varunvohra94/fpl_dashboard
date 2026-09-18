resource "random_password" "db_password" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_id" "db_name_suffix" {
  byte_length = 4
}

resource "google_sql_database_instance" "postgres" {
  name             = "fpl-postgres-${random_id.db_name_suffix.hex}"
  database_version = "POSTGRES_16"
  region           = var.region
  depends_on       = [var.private_vpc_connection]

  settings {
    tier                        = var.db_tier
    disk_size                   = var.db_disk_size_gb
    disk_type                   = "PD_SSD"
    disk_autoresize             = true
    disk_autoresize_limit       = 50
    deletion_protection_enabled = false # Set to true for production data retention

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = var.network_id
      enable_private_path_for_google_cloud_services = true
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 4
      update_track = "stable"
    }

    user_labels = {
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}

resource "google_sql_database" "db" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "user" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}

# ==============================================================================
# Google Secret Manager: Database Credentials & Connection Strings
# ==============================================================================

resource "google_secret_manager_secret" "db_password" {
  secret_id = "fpl-db-password"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed-by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "fpl-database-url"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed-by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "database_url_version" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql+asyncpg://${google_sql_user.user.name}:${random_password.db_password.result}@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.db.name}"
}

resource "google_secret_manager_secret" "sync_database_url" {
  secret_id = "fpl-sync-database-url"

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed-by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "sync_database_url_version" {
  secret      = google_secret_manager_secret.sync_database_url.id
  secret_data = "postgresql://${google_sql_user.user.name}:${random_password.db_password.result}@${google_sql_database_instance.postgres.private_ip_address}:5432/${google_sql_database.db.name}"
}
