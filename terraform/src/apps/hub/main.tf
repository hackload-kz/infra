provider "kubernetes" {
  config_path = "./kubeconfig"
}

provider "helm" {
  kubernetes {
    config_path = "./kubeconfig"
  }
}

module "cnpg_operator" {
  source = "../../modules/cnpg-operator"
}

module "cnpg_cluster" {
  source             = "../../modules/cnpg-cluster"
  storage_class      = var.storage_class
  storage_size       = var.cnpg_storage_size
  backup_destination = var.cnpg_backup_destination
  username           = "hackload"
  backup_retention   = var.cnpg_backup_retention
}

module "cert_manager" {
  source = "../../modules/cert-manager"

  create_cluster_issuer = true
  acme_email            = var.acme_email
}

module "traefik" {
  source = "../../modules/traefik"

  namespace               = "traefik-system"
  service_type            = var.traefik_service_type
  enable_dashboard        = var.traefik_enable_dashboard
  dashboard_host          = var.traefik_dashboard_host
  dashboard_tls_enabled   = var.traefik_dashboard_tls_enabled
  dashboard_cert_resolver = module.cert_manager.cluster_issuer_name

  persistence = {
    enabled      = true
    storageClass = var.storage_class
    size         = "128Mi"
    path         = "/data"
  }

  depends_on = [module.cert_manager]
}

module "hub" {
  source = "../../modules/hub"

  namespace             = "hub"
  image                 = "ghcr.io/hackload-kz/infra"
  tag                   = var.hub_image_tag
  host                  = var.hub_host
  replicas              = var.hub_replicas
  enable_tls            = true
  cert_issuer_name      = module.cert_manager.cluster_issuer_name
  db_connection_string  = var.hub_db_connection_string

  # NextAuth and OAuth configuration
  nextauth_url          = var.hub_nextauth_url
  nextauth_secret       = var.hub_nextauth_secret
  google_client_id      = var.hub_google_client_id
  google_client_secret  = var.hub_google_client_secret
  github_client_id      = var.hub_github_client_id
  github_client_secret  = var.hub_github_client_secret
  admin_users           = var.hub_admin_users

  registry_credentials = {
    server   = "ghcr.io"
    username = var.ghcr_username
    password = var.ghcr_token
    email    = var.ghcr_email
  }

  container_port = 8080
  service_port   = 80

  resources = {
    limits = {
      cpu    = "500m"
      memory = "512Mi"
    }
    requests = {
      cpu    = "200m"
      memory = "256Mi"
    }
  }

  depends_on = [module.traefik, module.cert_manager]
}
