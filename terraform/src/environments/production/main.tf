module "hub" {
  source = "../../apps/hub"

  acme_email              = "dmitriy.melnik@drim.dev"
  storage_class           = "csi-sc-cinderplugin"
  cnpg_storage_size       = "10Gi"
  cnpg_backup_destination = "https://hackloadprodcnpg.blob.core.windows.net/backups"
  cnpg_backup_retention   = "30d"

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

}
