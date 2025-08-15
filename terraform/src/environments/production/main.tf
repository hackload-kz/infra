module "hub" {
  source = "../../apps/hub"

  acme_email              = "dmitriy.melnik@drim.dev"
  storage_class           = "csi-sc-cinderplugin"
  cnpg_storage_size       = "10Gi"
  cnpg_backup_destination = "https://hackloadprodcnpg.blob.core.windows.net/backups"
  cnpg_backup_retention   = "30d"
  cnpg_expose_external    = true
  cnpg_external_host      = "hub.hackload.kz"
  cnpg_external_port      = var.cnpg_external_port

  hub_image_tag            = "sha-0d9d373"
  hub_host                 = "hub.hackload.kz"
  hub_replicas             = 2
  hub_db_connection_string = var.hub_db_connection_string
  hub_nextauth_url         = var.hub_nextauth_url
  hub_nextauth_secret      = var.hub_nextauth_secret
  hub_google_client_id     = var.hub_google_client_id
  hub_google_client_secret = var.hub_google_client_secret
  hub_github_client_id     = var.hub_github_client_id
  hub_github_client_secret = var.hub_github_client_secret
  hub_admin_users          = var.hub_admin_users

  ghcr_username = var.ghcr_username
  ghcr_token    = var.ghcr_token
  ghcr_email    = var.ghcr_email

  # Telemetry configuration
  telemetry_enabled                    = true
  telemetry_grafana_admin_password     = var.telemetry_grafana_admin_password
  telemetry_prometheus_storage_size    = "200Gi"
  telemetry_alertmanager_storage_size  = "5Gi"
  telemetry_grafana_storage_size       = "20Gi"
  
  # Enable metrics collection
  enable_metrics                       = true

}

module "service_provider_3g" {
  source = "../../apps/service-provider"

  # Infrastructure Configuration
  namespace         = "service-provider-3g"
  storage_class     = "csi-sc-cinderplugin"
  cnpg_storage_size = "10Gi"
  enable_metrics    = true

  # Service Provider Configuration
  service_provider_image = "ghcr.io/hackload-kz/service-provider"
  service_provider_tag   = "pkg-25331a91c6f43a938a17a239f97fbc0a3ab89f88"
  service_provider_host  = "hub.hackload.kz"
  service_provider_path  = "/event-provider/common"

  # Database Configuration
  db_connection_pool_size = 32

  # Certificate Management
  cert_issuer_name = "letsencrypt-prod"

  # Container Registry Credentials
  ghcr_username = var.ghcr_username
  ghcr_token    = var.ghcr_token
  ghcr_email    = var.ghcr_email

  # Resource Configuration
  service_provider_resources = {
    requests = {
      cpu    = "200m"
      memory = "256Mi"
    }
    limits = {
      cpu    = "500m"
      memory = "512Mi"
    }
  }
}
