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

  dockerhub_username = var.dockerhub_username
  dockerhub_token    = var.dockerhub_token

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

module "payment_provider" {
  source = "../../apps/payment-provider"

  # Infrastructure Configuration
  namespace         = "payment-provider"
  storage_class     = "csi-sc-cinderplugin"
  cnpg_storage_size = "10Gi"
  enable_metrics    = true

  # Payment Provider Configuration
  payment_provider_image = "ghcr.io/hackload-kz/paymentgateway"
  payment_provider_tag   = "efdf5b3"
  payment_provider_host  = "hub.hackload.kz"
  payment_provider_path  = "/payment-provider/common"

  # Database Configuration
  db_name                = "payment_provider"
  db_pool_size           = 20
  db_max_retry_count     = 3
  db_max_retry_delay     = "00:00:30"
  db_command_timeout     = 60

  # Security Configuration
  csrf_key    = "hackload-payment-gateway-csrf-key-2025"
  admin_token = "this-is-a-rand0m-token"
  admin_key   = "admin_token_2025_hackload_payment_gateway_secure_key_prod"

  # API Configuration
  base_url    = "https://hub.hackload.kz"
  api_version = "v1"

  # Metrics Configuration
  metrics_port     = 8081
  enable_dashboard = true

  # Certificate Management
  cert_issuer_name = "letsencrypt-prod"

  ghcr_username = var.ghcr_username
  ghcr_token    = var.ghcr_token
  ghcr_email    = var.ghcr_email

  # Resource Configuration
  payment_provider_resources = {
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

module "biletter" {
  source = "../../apps/biletter"

  # Infrastructure Configuration
  namespace         = "biletter"
  storage_class     = "csi-sc-cinderplugin"
  cnpg_storage_size = "10Gi"
  enable_metrics    = true

  # Biletter Configuration
  biletter_image = "ghcr.io/hackload-kz/biletter"
  biletter_tag   = "pkg-12fa4a9b7b455ebb786dc07471d0d9604991cc01"
  biletter_host  = "hub.hackload.kz"
  biletter_path  = "/biletter"

  # Certificate Management
  cert_issuer_name = "letsencrypt-prod"

  ghcr_username = var.ghcr_username
  ghcr_token    = var.ghcr_token
  ghcr_email    = var.ghcr_email

  # Resource Configuration
  biletter_resources = {
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

# Event provider modules

module "event_provider_482931" {
  source = "../../apps/service-provider"

  namespace         = "event-provider-482931"
  storage_class     = "csi-sc-cinderplugin"
  cnpg_storage_size = "10Gi"
  enable_metrics    = true

  service_provider_image = "ghcr.io/hackload-kz/service-provider"
  service_provider_tag   = "pkg-360af45ac3c9a11949a1ff7d44af52f09c85c9a1"
  service_provider_host  = "hub.hackload.kz"
  service_provider_path  = "/event/482931/event-provider"

  db_connection_pool_size = 16

  cert_issuer_name = "letsencrypt-prod"

  ghcr_username = var.ghcr_username
  ghcr_token    = var.ghcr_token
  ghcr_email    = var.ghcr_email

  service_provider_resources = {
    requests = {
      cpu    = "2"
      memory = "2Gi"
    }
    limits = {
      cpu    = "2"
      memory = "2Gi"
    }
  }
}

module "event_provider_736254" {
  source = "../../apps/service-provider"

  namespace         = "event-provider-736254"
  storage_class     = "csi-sc-cinderplugin"
  cnpg_storage_size = "10Gi"
  enable_metrics    = true

  service_provider_image = "ghcr.io/hackload-kz/service-provider"
  service_provider_tag   = "pkg-360af45ac3c9a11949a1ff7d44af52f09c85c9a1"
  service_provider_host  = "hub.hackload.kz"
  service_provider_path  = "/event/736254/event-provider"

  db_connection_pool_size = 16

  cert_issuer_name = "letsencrypt-prod"

  ghcr_username = var.ghcr_username
  ghcr_token    = var.ghcr_token
  ghcr_email    = var.ghcr_email

  service_provider_resources = {
    requests = {
      cpu    = "2"
      memory = "2Gi"
    }
    limits = {
      cpu    = "2"
      memory = "2Gi"
    }
  }
}

module "event_provider_195847" {
  source = "../../apps/service-provider"

  namespace         = "event-provider-195847"
  storage_class     = "csi-sc-cinderplugin"
  cnpg_storage_size = "10Gi"
  enable_metrics    = true

  service_provider_image = "ghcr.io/hackload-kz/service-provider"
  service_provider_tag   = "pkg-360af45ac3c9a11949a1ff7d44af52f09c85c9a1"
  service_provider_host  = "hub.hackload.kz"
  service_provider_path  = "/event/195847/event-provider"

  db_connection_pool_size = 16

  cert_issuer_name = "letsencrypt-prod"

  ghcr_username = var.ghcr_username
  ghcr_token    = var.ghcr_token
  ghcr_email    = var.ghcr_email

  service_provider_resources = {
    requests = {
      cpu    = "2"
      memory = "2Gi"
    }
    limits = {
      cpu    = "2"
      memory = "2Gi"
    }
  }
}

module "event_provider_629318" {
  source = "../../apps/service-provider"

  namespace         = "event-provider-629318"
  storage_class     = "csi-sc-cinderplugin"
  cnpg_storage_size = "10Gi"
  enable_metrics    = true

  service_provider_image = "ghcr.io/hackload-kz/service-provider"
  service_provider_tag   = "pkg-360af45ac3c9a11949a1ff7d44af52f09c85c9a1"
  service_provider_host  = "hub.hackload.kz"
  service_provider_path  = "/event/629318/event-provider"

  db_connection_pool_size = 16

  cert_issuer_name = "letsencrypt-prod"

  ghcr_username = var.ghcr_username
  ghcr_token    = var.ghcr_token
  ghcr_email    = var.ghcr_email

  service_provider_resources = {
    requests = {
      cpu    = "2"
      memory = "2Gi"
    }
    limits = {
      cpu    = "2"
      memory = "2Gi"
    }
  }
}

module "event_provider_873562" {
  source = "../../apps/service-provider"

  namespace         = "event-provider-873562"
  storage_class     = "csi-sc-cinderplugin"
  cnpg_storage_size = "10Gi"
  enable_metrics    = true

  service_provider_image = "ghcr.io/hackload-kz/service-provider"
  service_provider_tag   = "pkg-360af45ac3c9a11949a1ff7d44af52f09c85c9a1"
  service_provider_host  = "hub.hackload.kz"
  service_provider_path  = "/event/873562/event-provider"

  db_connection_pool_size = 16

  cert_issuer_name = "letsencrypt-prod"

  ghcr_username = var.ghcr_username
  ghcr_token    = var.ghcr_token
  ghcr_email    = var.ghcr_email

  service_provider_resources = {
    requests = {
      cpu    = "2"
      memory = "2Gi"
    }
    limits = {
      cpu    = "2"
      memory = "2Gi"
    }
  }
}

module "event_provider_541729" {
  source = "../../apps/service-provider"

  namespace         = "event-provider-541729"
  storage_class     = "csi-sc-cinderplugin"
  cnpg_storage_size = "10Gi"
  enable_metrics    = true

  service_provider_image = "ghcr.io/hackload-kz/service-provider"
  service_provider_tag   = "pkg-360af45ac3c9a11949a1ff7d44af52f09c85c9a1"
  service_provider_host  = "hub.hackload.kz"
  service_provider_path  = "/event/541729/event-provider"

  db_connection_pool_size = 16

  cert_issuer_name = "letsencrypt-prod"

  ghcr_username = var.ghcr_username
  ghcr_token    = var.ghcr_token
  ghcr_email    = var.ghcr_email

  service_provider_resources = {
    requests = {
      cpu    = "2"
      memory = "2Gi"
    }
    limits = {
      cpu    = "2"
      memory = "2Gi"
    }
  }
}
