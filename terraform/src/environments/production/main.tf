module "hub" {
  source = "../../apps/hub"

  acme_email              = "dmitriy.melnik@drim.dev"
  storage_class           = "csi-sc-cinderplugin"
  cnpg_storage_size       = "10Gi"
  cnpg_backup_destination = "https://hackloadprodcnpg.blob.core.windows.net/backups"
  cnpg_backup_retention   = "30d"
}
