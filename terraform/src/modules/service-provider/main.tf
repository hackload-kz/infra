resource "kubernetes_namespace" "service_provider" {
  metadata {
    name = var.namespace
  }
}

resource "kubernetes_secret" "registry_credentials" {
  metadata {
    name      = "ghcr-credentials"
    namespace = kubernetes_namespace.service_provider.metadata[0].name
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
    namespace = kubernetes_namespace.service_provider.metadata[0].name
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

          # Kafka configuration
          env {
            name  = "KAFKA_BOOTSTRAP_SERVERS"
            value = var.kafka_bootstrap_servers
          }

          env {
            name  = "KAFKA_CONSUMER_GROUP_ID"
            value = var.kafka_consumer_group_id
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
    namespace = kubernetes_namespace.service_provider.metadata[0].name
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
      namespace = kubernetes_namespace.service_provider.metadata[0].name
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
      namespace = kubernetes_namespace.service_provider.metadata[0].name
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
      namespace = kubernetes_namespace.service_provider.metadata[0].name
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
              namespace = kubernetes_namespace.service_provider.metadata[0].name
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
      namespace = kubernetes_namespace.service_provider.metadata[0].name
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
              namespace = kubernetes_namespace.service_provider.metadata[0].name
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
      namespace = kubernetes_namespace.service_provider.metadata[0].name
    }
    spec = {
      redirectScheme = {
        scheme    = "https"
        permanent = true
      }
    }
  }
}
