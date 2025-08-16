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

resource "kubernetes_deployment" "payment_provider" {
  metadata {
    name      = "payment-provider"
    namespace = var.namespace
    labels = {
      app = "payment-provider"
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = "payment-provider"
      }
    }

    template {
      metadata {
        labels = {
          app = "payment-provider"
        }
      }

      spec {
        image_pull_secrets {
          name = kubernetes_secret.registry_credentials.metadata[0].name
        }

        container {
          image = "${var.image}:${var.tag}"
          name  = "payment-provider"

          port {
            container_port = var.container_port
          }

          port {
            container_port = var.metrics_port
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

          # ASP.NET Core configuration
          env {
            name  = "ASPNETCORE_ENVIRONMENT"
            value = var.aspnetcore_environment
          }

          env {
            name  = "ASPNETCORE_URLS"
            value = "http://0.0.0.0:${var.container_port}"
          }

          # Database configuration
          env {
            name  = "ConnectionStrings__DefaultConnection"
            value = var.db_connection_string
          }

          # Security configuration
          env {
            name  = "Security__CsrfKey"
            value = var.csrf_key
          }

          env {
            name  = "AdminAuthentication__AdminToken"
            value = var.admin_token
          }

          env {
            name  = "AdminAuthentication__TokenHeaderName"
            value = "X-Admin-Token"
          }

          env {
            name  = "AdminAuthentication__EnableAdminEndpoints"
            value = "true"
          }

          # API configuration
          env {
            name  = "Api__BaseUrl"
            value = var.base_url
          }

          env {
            name  = "Api__Version"
            value = var.api_version
          }

          # Metrics configuration
          env {
            name  = "Metrics__Prometheus__Enabled"
            value = tostring(var.enable_metrics)
          }

          env {
            name  = "Metrics__Prometheus__Port"
            value = tostring(var.metrics_port)
          }

          env {
            name  = "Metrics__Prometheus__Host"
            value = "*"
          }

          env {
            name  = "Metrics__Dashboard__Enabled"
            value = tostring(var.enable_dashboard)
          }

          # Logging configuration - disable file logging to avoid permission issues
          env {
            name  = "Logging__Serilog__EnableFile"
            value = "false"
          }

          env {
            name  = "Logging__Serilog__EnableConsole"
            value = "true"
          }

          env {
            name  = "Logging__Serilog__LogDirectory"
            value = "/tmp/logs"
          }

          # Database configuration
          env {
            name  = "Database__EnableRetryOnFailure"
            value = "true"
          }

          env {
            name  = "Database__MaxRetryCount"
            value = tostring(var.db_max_retry_count)
          }

          env {
            name  = "Database__MaxRetryDelay"
            value = var.db_max_retry_delay
          }

          env {
            name  = "Database__CommandTimeout"
            value = tostring(var.db_command_timeout)
          }

          env {
            name  = "Database__PoolSize"
            value = tostring(var.db_pool_size)
          }

          # Health check
          readiness_probe {
            http_get {
              path = "/health"
              port = var.container_port
            }
            initial_delay_seconds = 30
            period_seconds        = 10
            timeout_seconds       = 5
            failure_threshold     = 3
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = var.container_port
            }
            initial_delay_seconds = 60
            period_seconds        = 30
            timeout_seconds       = 5
            failure_threshold     = 3
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      spec[0].template[0].spec[0].container[0].image,
      spec[0].replicas,
    ]
  }
}

resource "kubernetes_service" "payment_provider" {
  metadata {
    name      = "payment-provider"
    namespace = var.namespace
  }

  spec {
    selector = {
      app = "payment-provider"
    }

    port {
      name        = "http"
      port        = var.service_port
      target_port = var.container_port
    }

    port {
      name        = "metrics"
      port        = var.metrics_port
      target_port = var.metrics_port
    }

    type = "ClusterIP"
  }
}

# Certificate for TLS
resource "kubernetes_manifest" "payment_provider_certificate" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "payment-provider-tls"
      namespace = var.namespace
    }
    spec = {
      secretName = "payment-provider-tls"
      issuerRef = {
        name = var.cert_issuer_name
        kind = "ClusterIssuer"
      }
      commonName = var.host
      dnsNames   = [var.host]
    }
  }
}

# Middleware to strip the prefix
resource "kubernetes_manifest" "strip_prefix_middleware" {
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "Middleware"
    metadata = {
      name      = "payment-provider-strip-prefix"
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
resource "kubernetes_manifest" "payment_provider_ingressroute" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "payment-provider-ingressroute"
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
              name = kubernetes_service.payment_provider.metadata[0].name
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
        secretName = "payment-provider-tls"
      }
    }
  }
}

# HTTP to HTTPS redirect
resource "kubernetes_manifest" "payment_provider_redirect" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "payment-provider-redirect"
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