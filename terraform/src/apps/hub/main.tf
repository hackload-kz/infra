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
  expose_external    = var.cnpg_expose_external
  external_host      = var.cnpg_external_host
  external_port      = var.cnpg_external_port
  enable_metrics     = var.enable_metrics
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
  expose_postgres         = var.cnpg_expose_external
  postgres_port           = var.cnpg_external_port

  persistence = {
    enabled      = true
    storageClass = var.storage_class
    size         = "128Mi"
    path         = "/data"
  }

  depends_on = [module.cert_manager]
}

module "k6_operator" {
  source = "../../modules/k6-operator"

  namespace               = "k6-system"
  release_name            = "k6-operator"
  chart_version           = "3.14.1"
  create_test_service_account = true
  
  helm_values = {
    "namespace.create"                  = false
    "manager.resources.limits.cpu"      = "500m"
    "manager.resources.limits.memory"   = "512Mi"
    "manager.resources.requests.cpu"    = "100m"
    "manager.resources.requests.memory" = "128Mi"
  }
}

module "telemetry" {
  count  = var.telemetry_enabled ? 1 : 0
  source = "../../modules/telemetry"

  namespace         = "telemetry"
  cert_issuer_name  = module.cert_manager.cluster_issuer_name
  storage_class     = var.storage_class

  # Prometheus configuration
  enable_prometheus        = true
  prometheus_host          = var.hub_host
  prometheus_path          = "/prometheus"
  prometheus_storage_size  = var.telemetry_prometheus_storage_size

  # Grafana configuration
  enable_grafana           = true
  grafana_host             = var.hub_host
  grafana_path             = "/grafana"
  grafana_admin_password   = var.telemetry_grafana_admin_password
  grafana_storage_size     = var.telemetry_grafana_storage_size

  # Alertmanager configuration
  enable_alertmanager       = true
  alertmanager_host         = var.hub_host
  alertmanager_storage_size = var.telemetry_alertmanager_storage_size

  prometheus_helm_values = {
    prometheus = {
      prometheusSpec = {
        retention = "30d"
        externalUrl = "https://${var.hub_host}/prometheus"
        routePrefix = "/prometheus"
        enableRemoteWriteReceiver = true
        # Enable ServiceMonitor discovery across all namespaces
        serviceMonitorNamespaceSelector = {}
        serviceMonitorSelector = {
          matchLabels = {
            release = "prometheus"
          }
        }
        podMonitorNamespaceSelector = {}
        podMonitorSelector = {}
        additionalArgs = [
          {
            name  = "enable-feature"
            value = "native-histograms"
          }
        ]
        storageSpec = {
          volumeClaimTemplate = {
            spec = {
              storageClassName = var.storage_class
              accessModes      = ["ReadWriteOnce"]
              resources = {
                requests = {
                  storage = var.telemetry_prometheus_storage_size
                }
              }
            }
          }
        }
      }
    }
    alertmanager = {
      alertmanagerSpec = {
        storage = {
          volumeClaimTemplate = {
            spec = {
              storageClassName = var.storage_class
              accessModes      = ["ReadWriteOnce"]
              resources = {
                requests = {
                  storage = var.telemetry_alertmanager_storage_size
                }
              }
            }
          }
        }
      }
    }
    grafana = {
      enabled = true
      adminPassword = var.telemetry_grafana_admin_password
      persistence = {
        enabled = true
        storageClassName = var.storage_class
        size = var.telemetry_grafana_storage_size
      }
      "grafana.ini" = {
        server = {
          root_url = "https://${var.hub_host}/grafana"
          serve_from_sub_path = true
        }
      }
    }
    kubeStateMetrics = {
      enabled = false
    }
  }

  depends_on = [module.traefik, module.cert_manager]
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

