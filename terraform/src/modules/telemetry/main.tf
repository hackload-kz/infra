resource "kubernetes_namespace" "telemetry" {
  metadata {
    name = var.namespace
  }
}

# Prometheus Stack
resource "helm_release" "prometheus" {
  count = var.enable_prometheus ? 1 : 0

  name       = var.prometheus_release_name
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = var.prometheus_chart_version
  namespace  = kubernetes_namespace.telemetry.metadata[0].name

  values = [
    yamlencode(merge(
      var.prometheus_helm_values,
      {
        prometheus = {
          prometheusSpec = {
            retention = "30d"
            enableRemoteWriteReceiver = true
            resources = var.prometheus_resources
            externalUrl = "https://${var.prometheus_host}${var.prometheus_path}"
            routePrefix = var.prometheus_path
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
            containers = [
              {
                name = "prometheus"
                livenessProbe = {
                  failureThreshold = 500
                }
                startupProbe = {
                  failureThreshold = 500
                }
              }
            ]
            storageSpec = {
              volumeClaimTemplate = {
                spec = {
                  storageClassName = var.storage_class
                  accessModes      = ["ReadWriteOnce"]
                  resources = {
                    requests = {
                      storage = var.prometheus_storage_size
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
                      storage = var.alertmanager_storage_size
                    }
                  }
                }
              }
            }
          }
        }
        grafana = {
          enabled = true
          adminPassword = var.grafana_admin_password
          persistence = {
            enabled = true
            storageClassName = var.storage_class
            size = var.grafana_storage_size
          }
          "grafana.ini" = {
            server = {
              root_url = "https://${var.grafana_host}/grafana"
              serve_from_sub_path = true
            }
            "auth.anonymous" = {
              enabled = true
              org_name = "Main Org."
              org_role = "Viewer"
              hide_signin_menu = true
            }
          }
        }
        kubeStateMetrics = {
          enabled = false
        }
      }
    ))
  ]
}

# Prometheus Certificate
resource "kubernetes_manifest" "prometheus_certificate" {
  count = var.enable_prometheus && var.enable_ingress ? 1 : 0
  
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "${var.prometheus_release_name}-prometheus-tls"
      namespace = kubernetes_namespace.telemetry.metadata[0].name
    }
    spec = {
      secretName = "${var.prometheus_release_name}-prometheus-tls"
      issuerRef = {
        name = var.cert_issuer_name
        kind = "ClusterIssuer"
      }
      commonName = var.prometheus_host
      dnsNames   = [var.prometheus_host]
    }
  }
}

# Prometheus StripPrefix Middleware
# resource "kubernetes_manifest" "prometheus_stripprefix" {
#   count = var.enable_prometheus && var.enable_ingress ? 1 : 0

#   manifest = {
#     apiVersion = "traefik.containo.us/v1alpha1"
#     kind       = "Middleware"
#     metadata = {
#       name      = "prometheus-stripprefix"
#       namespace = kubernetes_namespace.telemetry.metadata[0].name
#     }
#     spec = {
#       stripPrefix = {
#         prefixes = [var.prometheus_path]
#       }
#     }
#   }
# }

# Prometheus IngressRoute
resource "kubernetes_manifest" "prometheus_ingressroute" {
  count = var.enable_prometheus && var.enable_ingress ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "${var.prometheus_release_name}-prometheus-ingressroute"
      namespace = kubernetes_namespace.telemetry.metadata[0].name
    }
    spec = {
      entryPoints = ["websecure"]
      routes = [
        {
          match = "Host(`${var.prometheus_host}`) && PathPrefix(`${var.prometheus_path}`)"
          kind  = "Rule"
          services = [
            {
              name = "${var.prometheus_release_name}-kube-prometheus-prometheus"
              port = 9090
            }
          ]
          # middlewares = [
          #   {
          #     name = kubernetes_manifest.prometheus_stripprefix[0].manifest.metadata.name
          #   }
          # ]
        }
      ]
      tls = {
        secretName = "${var.prometheus_release_name}-prometheus-tls"
      }
    }
  }
}

# Alertmanager Certificate
resource "kubernetes_manifest" "alertmanager_certificate" {
  count = var.enable_prometheus && var.enable_ingress && var.enable_alertmanager ? 1 : 0
  
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "${var.prometheus_release_name}-alertmanager-tls"
      namespace = kubernetes_namespace.telemetry.metadata[0].name
    }
    spec = {
      secretName = "${var.prometheus_release_name}-alertmanager-tls"
      issuerRef = {
        name = var.cert_issuer_name
        kind = "ClusterIssuer"
      }
      commonName = var.alertmanager_host
      dnsNames   = [var.alertmanager_host]
    }
  }
}

# Alertmanager IngressRoute
resource "kubernetes_manifest" "alertmanager_ingressroute" {
  count = var.enable_prometheus && var.enable_ingress && var.enable_alertmanager ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "${var.prometheus_release_name}-alertmanager-ingressroute"
      namespace = kubernetes_namespace.telemetry.metadata[0].name
    }
    spec = {
      entryPoints = ["websecure"]
      routes = [
        {
          match = "Host(`${var.alertmanager_host}`) && PathPrefix(`/alertmanager`)"
          kind  = "Rule"
          services = [
            {
              name = "${var.prometheus_release_name}-kube-prometheus-alertmanager"
              port = 9093
            }
          ]
        }
      ]
      tls = {
        secretName = "${var.prometheus_release_name}-alertmanager-tls"
      }
    }
  }
}

# Grafana Certificate
resource "kubernetes_manifest" "grafana_certificate" {
  count = var.enable_grafana && var.enable_ingress ? 1 : 0
  
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "${var.prometheus_release_name}-grafana-tls"
      namespace = kubernetes_namespace.telemetry.metadata[0].name
    }
    spec = {
      secretName = "${var.prometheus_release_name}-grafana-tls"
      issuerRef = {
        name = var.cert_issuer_name
        kind = "ClusterIssuer"
      }
      commonName = var.grafana_host
      dnsNames   = [var.grafana_host]
    }
  }
}

# Grafana StripPrefix Middleware
resource "kubernetes_manifest" "grafana_stripprefix" {
  count = var.enable_grafana && var.enable_ingress ? 1 : 0

  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "Middleware"
    metadata = {
      name      = "grafana-stripprefix"
      namespace = kubernetes_namespace.telemetry.metadata[0].name
    }
    spec = {
      stripPrefix = {
        prefixes = [var.grafana_path]
      }
    }
  }
}

# Grafana IngressRoute
resource "kubernetes_manifest" "grafana_ingressroute" {
  count = var.enable_grafana && var.enable_ingress ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "${var.prometheus_release_name}-grafana-ingressroute"
      namespace = kubernetes_namespace.telemetry.metadata[0].name
    }
    spec = {
      entryPoints = ["websecure"]
      routes = [
        {
          match = "Host(`${var.grafana_host}`) && PathPrefix(`${var.grafana_path}`)"
          kind  = "Rule"
          services = [
            {
              name = "${var.prometheus_release_name}-grafana"
              port = 80
            }
          ]
          middlewares = [
            {
              name = kubernetes_manifest.grafana_stripprefix[0].manifest.metadata.name
            }
          ]
        }
      ]
      tls = {
        secretName = "${var.prometheus_release_name}-grafana-tls"
      }
    }
  }
}

# Default Grafana Dashboards
resource "kubernetes_config_map" "grafana_dashboards" {
  count = var.enable_grafana && var.enable_default_dashboards ? 1 : 0

  metadata {
    name      = "${var.prometheus_release_name}-grafana-dashboards"
    namespace = kubernetes_namespace.telemetry.metadata[0].name
    labels = {
      grafana_dashboard = "1"
    }
  }

  data = {
    "kubernetes-cluster-monitoring.json" = file("${path.module}/dashboards/kubernetes-cluster-monitoring.json")
    "kubernetes-pods-monitoring.json"    = file("${path.module}/dashboards/kubernetes-pods-monitoring.json")
  }
}
