# Telemetry Module

This module deploys a complete telemetry stack with Prometheus and Grafana using Helm charts.

## Features

- **Prometheus**: Metrics collection and storage with kube-prometheus-stack
- **Grafana**: Data visualization and dashboards
- **Alertmanager**: Alert handling and routing
- **Ingress**: Path-based routing with TLS support
- **Persistent Storage**: For metrics and dashboard data
- **Default Dashboards**: Kubernetes telemetry dashboards

## Usage

```hcl
module "telemetry" {
  source = "../../modules/telemetry"

  namespace         = "telemetry"
  cert_issuer_name  = "letsencrypt-prod"
  storage_class     = "csi-sc-cinderplugin"

  # Prometheus configuration
  enable_prometheus        = true
  prometheus_host          = "hub.hackload.kz"
  prometheus_path          = "/prometheus"
  prometheus_storage_size  = "10Gi"

  # Grafana configuration
  enable_grafana           = true
  grafana_host             = "hub.hackload.kz"
  grafana_path             = "/grafana"
  grafana_admin_password   = "secure-password"
  grafana_storage_size     = "10Gi"

  # Alertmanager configuration
  enable_alertmanager      = true
  alertmanager_host        = "hub.hackload.kz"
  alertmanager_storage_size = "2Gi"

  prometheus_helm_values = {
    prometheus = {
      prometheusSpec = {
        retention = "30d"
        externalUrl = "https://hub.hackload.kz/prometheus"
        routePrefix = "/prometheus"
        storageSpec = {
          volumeClaimTemplate = {
            spec = {
              storageClassName = "csi-sc-cinderplugin"
              accessModes      = ["ReadWriteOnce"]
              resources = {
                requests = {
                  storage = "10Gi"
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
              storageClassName = "csi-sc-cinderplugin"
              accessModes      = ["ReadWriteOnce"]
              resources = {
                requests = {
                  storage = "2Gi"
                }
              }
            }
          }
        }
      }
    }
    grafana = {
      enabled = false  # We deploy Grafana separately
    }
  }

  grafana_helm_values = {
    persistence = {
      enabled          = true
      storageClassName = "csi-sc-cinderplugin"
      size             = "10Gi"
    }
    "grafana.ini" = {
      server = {
        root_url            = "https://hub.hackload.kz/grafana"
        serve_from_sub_path = true
      }
    }
    datasources = {
      "datasources.yaml" = {
        apiVersion = 1
        datasources = [
          {
            name      = "Prometheus"
            type      = "prometheus"
            url       = "http://prometheus-kube-prometheus-stack-prometheus.telemetry.svc.cluster.local:9090"
            isDefault = true
          }
        ]
      }
    }
  }
}
```

## Components

### Prometheus Stack
- **Prometheus Server**: Metrics collection and storage
- **Alertmanager**: Alert handling and routing
- **Grafana**: Data visualization (can be disabled)
- **Node Exporter**: Node-level metrics
- **kube-state-metrics**: Kubernetes object metrics
- **Operator**: Manages Prometheus resources

### Grafana
- **Standalone Grafana**: Separate from Prometheus stack
- **Dashboard Providers**: Auto-loading of dashboards
- **Data Sources**: Pre-configured Prometheus connection
- **Persistence**: Dashboard and configuration storage

### Ingress Configuration
- **Traefik IngressRoute**: Native Traefik routing
- **TLS Certificates**: Automatic cert-manager integration
- **Path-based Routing**: `/prometheus` and `/grafana` paths
- **Middleware**: Strip prefix for proper routing

## Outputs

- Service names and ports for each component
- External URLs for web access
- Internal cluster URLs for service communication
- Namespace and configuration details

## Dependencies

- Kubernetes cluster
- Helm provider
- cert-manager (for TLS certificates)
- Traefik (for ingress)
- Storage class for persistent volumes

## Default Dashboards

The module includes default Kubernetes telemetry dashboards:
- `kubernetes-cluster-monitoring.json`: Cluster-level metrics
- `kubernetes-pods-monitoring.json`: Pod-level metrics

## Security

- TLS encryption for all external access
- Separate namespaces for isolation
- Configurable admin credentials
- Optional anonymous access control