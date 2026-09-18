output "instance_name" {
  description = "Cloud SQL instance name"
  value       = google_sql_database_instance.postgres.name
}

output "instance_connection_name" {
  description = "Cloud SQL instance connection name (for Cloud SQL Proxy / Cloud Run connectors)"
  value       = google_sql_database_instance.postgres.connection_name
}

output "private_ip_address" {
  description = "Private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "database_name" {
  description = "Name of the PostgreSQL database"
  value       = google_sql_database.db.name
}

output "database_user" {
  description = "Name of the database user"
  value       = google_sql_user.user.name
}

output "secret_database_url_id" {
  description = "Secret ID for the async SQLAlchemy DATABASE_URL"
  value       = google_secret_manager_secret.database_url.secret_id
}

output "secret_sync_database_url_id" {
  description = "Secret ID for the sync PostgreSQL SYNC_DATABASE_URL"
  value       = google_secret_manager_secret.sync_database_url.secret_id
}

output "secret_db_password_id" {
  description = "Secret ID for the database password"
  value       = google_secret_manager_secret.db_password.secret_id
}
