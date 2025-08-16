provider "kubernetes" {
  config_path = "./kubeconfig"
}

provider "helm" {
  kubernetes {
    config_path = "./kubeconfig"
  }
}

# Dedicated PostgreSQL cluster for payment-provider
module "cnpg_cluster" {
  source             = "../../modules/cnpg-cluster"
  namespace          = var.namespace
  storage_class      = var.storage_class
  storage_size       = var.cnpg_storage_size
  instances          = 1     # Single replica as requested
  backup_destination = null  # Disable backups as requested
  username           = "paymentuser"
  backup_retention   = null  # Disable backups
  expose_external    = false # Disable external access as requested
  external_host      = null  # No external access
  external_port      = null  # No external access
  enable_metrics     = var.enable_metrics
}

# Payment Provider module
module "payment_provider" {
  source = "../../modules/payment-provider"

  namespace = var.namespace
  image     = var.payment_provider_image
  tag       = var.payment_provider_tag
  host      = var.payment_provider_host
  
  enable_tls       = true
  cert_issuer_name = var.cert_issuer_name
  path_prefix      = var.payment_provider_path

  # Database configuration - use dedicated CNPG cluster
  db_connection_string     = "Host=${module.cnpg_cluster.host};Port=${module.cnpg_cluster.port};Database=${var.db_name};Username=${module.cnpg_cluster.username};Password=${module.cnpg_cluster.password};Include Error Detail=true"
  db_name                  = var.db_name
  db_user                  = module.cnpg_cluster.username
  db_password              = module.cnpg_cluster.password
  db_host                  = module.cnpg_cluster.host
  db_port                  = module.cnpg_cluster.port
  db_pool_size             = var.db_pool_size
  db_max_retry_count       = var.db_max_retry_count
  db_max_retry_delay       = var.db_max_retry_delay
  db_command_timeout       = var.db_command_timeout

  # Security configuration
  csrf_key    = var.csrf_key
  admin_token = var.admin_token
  admin_key   = var.admin_key

  # API configuration
  base_url    = var.base_url
  api_version = var.api_version

  # Metrics configuration
  enable_metrics    = var.enable_metrics
  metrics_port      = var.metrics_port
  enable_dashboard  = var.enable_dashboard

  registry_credentials = {
    server   = "ghcr.io"
    username = var.ghcr_username
    password = var.ghcr_token
    email    = var.ghcr_email
  }

  resources = var.payment_provider_resources

  depends_on = [module.cnpg_cluster]
}
