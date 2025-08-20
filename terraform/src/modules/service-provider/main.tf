resource "kubernetes_secret" "registry_credentials" {
  metadata {
    name      = "ghcr-credentials"
    namespace = var.namespace
  }

  type = "kubernetes.io/dockerconfigjson"

  data = {
    ".dockerconfigjson" = jsonencode({
      auths = {
        "${var.registry_credentials.server}" = {
          username = var.registry_credentials.username
          password = var.registry_credentials.password
          email    = var.registry_credentials.email
          auth     = base64encode("${var.registry_credentials.username}:${var.registry_credentials.password}")
        }
      }
    })
  }
}

resource "kubernetes_deployment" "service_provider" {
  metadata {
    name      = "service-provider"
    namespace = var.namespace
    labels = {
      app = "service-provider"
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = "service-provider"
      }
    }

    template {
      metadata {
        labels = {
          app = "service-provider"
        }
      }

      spec {
        image_pull_secrets {
          name = kubernetes_secret.registry_credentials.metadata[0].name
        }

        container {
          image = "${var.image}:${var.tag}"
          name  = "service-provider"

          port {
            container_port = var.container_port
          }

          resources {
            limits = {
              cpu    = var.resources.limits.cpu
              memory = var.resources.limits.memory
            }
            requests = {
              cpu    = var.resources.requests.cpu
              memory = var.resources.requests.memory
            }
          }

          # Database configuration
          env {
            name  = "DB_JDBC_URL"
            value = var.db_jdbc_url
          }

          env {
            name  = "DB_JDBC_USER"
            value = var.db_jdbc_user
          }

          env {
            name  = "DB_JDBC_PASSWORD"
            value = var.db_jdbc_password
          }

          env {
            name  = "DB_CONNECTION_POOL_SIZE"
            value = tostring(var.db_connection_pool_size)
          }

          env {
            name  = "PROJECTIONS_DB_JDBC_URL"
            value = var.db_jdbc_url
          }

          env {
            name  = "PROJECTIONS_DB_JDBC_USER"
            value = var.db_jdbc_user
          }

          env {
            name  = "PROJECTIONS_DB_JDBC_PASSWORD"
            value = var.db_jdbc_password
          }

          env {
            name  = "PROJECTIONS_DB_CONNECTION_POOL_SIZE"
            value = tostring(var.db_connection_pool_size)
          }

          # Kafka configuration
          env {
            name  = "KAFKA_BOOTSTRAP_SERVERS"
            value = var.kafka_bootstrap_servers
          }

          env {
            name  = "KAFKA_CONSUMER_GROUP_ID"
            value = var.kafka_consumer_group_id
          }

          env {
            name  = "KAFKA_CONSUMER_OFFSET"
            value = "latest"
          }

          env {
            name = "OTEL_EXPORTER_OTLP_ENDPOINT"
            value = "http://otel-collector:4317"
          }

          # liveness_probe {
          #   http_get {
          #     path = "/health"
          #     port = var.container_port
          #   }
          #   initial_delay_seconds = 30
          #   period_seconds        = 10
          # }

          # readiness_probe {
          #   http_get {
          #     path = "/health"
          #     port = var.container_port
          #   }
          #   initial_delay_seconds = 5
          #   period_seconds        = 5
          # }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      spec[0].template[0].spec[0].container[0].image,
      spec[0].template[0].spec[0].container[0].env,
      spec[0].replicas,
    ]
  }
}

resource "kubernetes_service" "service_provider" {
  metadata {
    name      = "service-provider"
    namespace = var.namespace
  }

  spec {
    selector = {
      app = "service-provider"
    }

    port {
      port        = var.service_port
      target_port = var.container_port
    }

    type = "ClusterIP"
  }
}

# Certificate for TLS
resource "kubernetes_manifest" "service_provider_certificate" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "service-provider-tls"
      namespace = var.namespace
    }
    spec = {
      secretName = "service-provider-tls"
      issuerRef = {
        name = var.cert_issuer_name
        kind = "ClusterIssuer"
      }
      commonName = var.host
      dnsNames   = [var.host]
    }
  }
}

# Middleware to strip the /service-provider prefix
resource "kubernetes_manifest" "strip_prefix_middleware" {
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "Middleware"
    metadata = {
      name      = "service-provider-strip-prefix"
      namespace = var.namespace
    }
    spec = {
      stripPrefix = {
        prefixes = [var.path_prefix]
      }
    }
  }
}

# IngressRoute for HTTPS
resource "kubernetes_manifest" "service_provider_ingressroute" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "service-provider-ingressroute"
      namespace = var.namespace
    }
    spec = {
      entryPoints = ["websecure"]
      routes = [
        {
          match = "Host(`${var.host}`) && PathPrefix(`${var.path_prefix}`)"
          kind  = "Rule"
          services = [
            {
              name = kubernetes_service.service_provider.metadata[0].name
              port = var.service_port
            }
          ]
          middlewares = [
            {
              name      = kubernetes_manifest.strip_prefix_middleware.manifest.metadata.name
              namespace = var.namespace
            }
          ]
        }
      ]
      tls = {
        secretName = "service-provider-tls"
      }
    }
  }
}

# HTTP to HTTPS redirect
resource "kubernetes_manifest" "service_provider_redirect" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "service-provider-redirect"
      namespace = var.namespace
    }
    spec = {
      entryPoints = ["web"]
      routes = [
        {
          match = "Host(`${var.host}`) && PathPrefix(`${var.path_prefix}`)"
          kind  = "Rule"
          services = [
            {
              name = "api@internal"
              kind = "TraefikService"
            }
          ]
          middlewares = [
            {
              name      = kubernetes_manifest.redirect_middleware[0].manifest.metadata.name
              namespace = var.namespace
            }
          ]
        }
      ]
    }
  }
}

resource "kubernetes_manifest" "redirect_middleware" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "Middleware"
    metadata = {
      name      = "redirect-to-https"
      namespace = var.namespace
    }
    spec = {
      redirectScheme = {
        scheme    = "https"
        permanent = true
      }
    }
  }
}

# OpenTelemetry Collector ConfigMap
resource "kubernetes_config_map" "otel_collector_config" {
  metadata {
    name      = "otel-collector-config"
    namespace = var.namespace
  }

  data = {
    "otel-collector-config.yaml" = <<-EOT
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  debug:
    verbosity: detailed
  nowhere:
    verbosity: none
  logging:
    loglevel: error
    sampling_initial: 0
    sampling_thereafter: 0
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: event-provider
    const_labels:
      test_label: event-provider-test-label
    send_timestamps: true
    metric_expiration: 180m
    resource_to_telemetry_conversion:
      enabled: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [nowhere]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug, prometheus]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [nowhere]
EOT
  }
}

# OpenTelemetry Collector Deployment
resource "kubernetes_deployment" "otel_collector" {
  metadata {
    name      = "otel-collector"
    namespace = var.namespace
    labels = {
      app = "otel-collector"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "otel-collector"
      }
    }

    template {
      metadata {
        labels = {
          app = "otel-collector"
        }
      }

      spec {
        container {
          name  = "otel-collector"
          image = "otel/opentelemetry-collector-contrib:0.91.0"

          args = ["--config=/etc/otel-collector-config.yaml"]

          port {
            name           = "otlp-grpc"
            container_port = 4317
          }

          port {
            name           = "otlp-http"
            container_port = 4318
          }

          port {
            name           = "metrics"
            container_port = 8889
          }

          volume_mount {
            name       = "otel-collector-config-vol"
            mount_path = "/etc/otel-collector-config.yaml"
            sub_path   = "otel-collector-config.yaml"
          }

          resources {
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
            limits = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }

        volume {
          name = "otel-collector-config-vol"
          config_map {
            name = kubernetes_config_map.otel_collector_config.metadata[0].name
          }
        }
      }
    }
  }
}

# OpenTelemetry Collector Service
resource "kubernetes_service" "otel_collector" {
  metadata {
    name      = "otel-collector"
    namespace = var.namespace
    labels = {
      app = "otel-collector"
    }
  }

  spec {
    selector = {
      app = "otel-collector"
    }

    port {
      name        = "otlp-grpc"
      port        = 4317
      target_port = 4317
      protocol    = "TCP"
    }

    port {
      name        = "otlp-http"
      port        = 4318
      target_port = 4318
      protocol    = "TCP"
    }

    port {
      name        = "metrics"
      port        = 8889
      target_port = 8889
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# ServiceMonitor for OpenTelemetry metrics
resource "kubernetes_manifest" "otel_collector_servicemonitor" {
  count = var.enable_metrics ? 1 : 0

  manifest = {
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "ServiceMonitor"
    metadata = {
      name      = "otel_collector-prometheus"
      namespace = var.namespace
      labels = {
        app = "otel_collector"
        release = "prometheus"
      }
    }
    spec = {
      selector = {
        matchLabels = {
          app = "otel_collector"
        }
      }
      endpoints = [
        {
          port = "metrics"
          path = "/metrics"
          interval = "30s"
        }
      ]
    }
  }

  #depends_on = [kubernetes_service.kafka_jmx_exporter]
}
