provider "kubernetes" {
  config_path = "./kubeconfig"
}

provider "helm" {
  kubernetes {
    config_path = "./kubeconfig"
  }
}

# Dedicated PostgreSQL cluster for service-provider
module "cnpg_cluster" {
  source             = "../../modules/cnpg-cluster"
  namespace          = var.namespace
  storage_class      = var.storage_class
  storage_size       = var.cnpg_storage_size
  instances          = 1     # Single replica as requested
  backup_destination = null  # Disable backups as requested
  username           = "serviceuser"
  backup_retention   = null  # Disable backups
  expose_external    = false # Disable external access as requested
  external_host      = null  # No external access
  external_port      = null  # No external access
  enable_metrics     = var.enable_metrics
}

# Kafka module
module "kafka" {
  source = "../../modules/kafka"

  namespace      = var.namespace
  storage_class  = var.storage_class
  enable_metrics = var.enable_metrics
}

# Service Provider module
module "service_provider" {
  source = "../../modules/service-provider"

  namespace = var.namespace
  image     = var.service_provider_image
  tag       = var.service_provider_tag
  host      = var.service_provider_host
  
  enable_tls       = true
  cert_issuer_name = var.cert_issuer_name
  path_prefix      = var.service_provider_path

  # Database configuration - use dedicated CNPG cluster
  db_jdbc_url              = "jdbc:postgresql://${module.cnpg_cluster.host}:${module.cnpg_cluster.port}/service_provider"
  db_jdbc_user             = module.cnpg_cluster.username
  db_jdbc_password         = module.cnpg_cluster.password
  db_connection_pool_size  = var.db_connection_pool_size

  # Kafka configuration
  kafka_bootstrap_servers = module.kafka.kafka_bootstrap_server_internal
  kafka_consumer_group_id = "service-provider"

  registry_credentials = {
    server   = "ghcr.io"
    username = var.ghcr_username
    password = var.ghcr_token
    email    = var.ghcr_email
  }

  resources = var.service_provider_resources

  depends_on = [module.cnpg_cluster, module.kafka]
}
