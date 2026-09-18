# ==============================================================================
# FPL Platform - Root Terraform Module Orchestration
# ==============================================================================

module "artifact_registry" {
  source      = "./modules/artifact_registry"
  region      = var.region
  environment = var.environment
}

module "networking" {
  source      = "./modules/networking"
  region      = var.region
  environment = var.environment
}

module "database" {
  source                 = "./modules/database"
  region                 = var.region
  environment            = var.environment
  network_id             = module.networking.network_id
  private_vpc_connection = module.networking.private_vpc_connection
  db_tier                = var.db_tier
  db_name                = var.db_name
  db_user                = var.db_user
  db_disk_size_gb        = var.db_disk_size_gb
}

module "iam" {
  source      = "./modules/iam"
  project_id  = var.project_id
  environment = var.environment
}

module "services" {
  source                      = "./modules/services"
  project_id                  = var.project_id
  region                      = var.region
  environment                 = var.environment
  fpl_league_id               = var.fpl_league_id
  min_instances               = var.min_instances
  max_instances               = var.max_instances
  backend_cpu                 = var.backend_cpu
  backend_memory              = var.backend_memory
  frontend_cpu                = var.frontend_cpu
  frontend_memory             = var.frontend_memory
  backend_sa_email            = module.iam.backend_sa_email
  frontend_sa_email           = module.iam.frontend_sa_email
  pipeline_sa_email           = module.iam.pipeline_sa_email
  scheduler_sa_email          = module.iam.scheduler_sa_email
  vpc_connector_id            = module.networking.vpc_connector_id
  instance_connection_name    = module.database.instance_connection_name
  secret_database_url_id      = module.database.secret_database_url_id
  secret_sync_database_url_id = module.database.secret_sync_database_url_id
  backend_image               = var.backend_image
  frontend_image              = var.frontend_image
  pipeline_image              = var.pipeline_image
}
