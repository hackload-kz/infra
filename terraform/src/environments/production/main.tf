module "hub" {
  source = "../../apps/hub"

  acme_email              = "dmitriy.melnik@drim.dev"
  storage_class           = "csi-sc-cinderplugin"
  cnpg_storage_size       = "10Gi"
  cnpg_backup_destination = "https://hackloadprodcnpg.blob.core.windows.net/backups"
  cnpg_backup_retention   = "30d"

  hub_image_tag            = "sha-840ddac"
  hub_host                 = "hub.hackload.kz"
  hub_replicas             = 2
  hub_db_connection_string = var.hub_db_connection_string

  ghcr_username = var.ghcr_username
  ghcr_token    = var.ghcr_token
  ghcr_email    = var.ghcr_email
}
