provider "kubernetes" {
  config_path = "./kubeconfig"
}

provider "helm" {
  kubernetes {
    config_path = "./kubeconfig"
  }
}

# Dedicated PostgreSQL cluster for biletter
module "cnpg_cluster" {
  source             = "../../modules/cnpg-cluster"
  namespace          = var.namespace
  storage_class      = var.storage_class
  storage_size       = var.cnpg_storage_size
  instances          = 1     # Single replica as requested
  backup_destination = null  # Disable backups as requested
  username           = "biletter"
  backup_retention   = null  # Disable backups
  expose_external    = false # Disable external access as requested
  external_host      = null  # No external access
  external_port      = null  # No external access
  enable_metrics     = var.enable_metrics
}

# Biletter module
module "biletter" {
  source = "../../modules/biletter"

  namespace = var.namespace
  image     = var.biletter_image
  tag       = var.biletter_tag
  host      = var.biletter_host
  
  enable_tls       = true
  cert_issuer_name = var.cert_issuer_name
  path_prefix      = var.biletter_path

  # Database configuration - use dedicated CNPG cluster
  db_jdbc_url      = "jdbc:postgresql://${module.cnpg_cluster.host}:${module.cnpg_cluster.port}/biletter"
  db_jdbc_user     = module.cnpg_cluster.username
  db_jdbc_password = module.cnpg_cluster.password

  registry_credentials = {
    server   = "ghcr.io"
    username = var.ghcr_username
    password = var.ghcr_token
    email    = var.ghcr_email
  }

  resources = var.biletter_resources

  depends_on = [module.cnpg_cluster]
}
