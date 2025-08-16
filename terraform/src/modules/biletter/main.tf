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

resource "kubernetes_deployment" "biletter" {
  metadata {
    name      = "biletter"
    namespace = var.namespace
    labels = {
      app = "biletter"
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = "biletter"
      }
    }

    template {
      metadata {
        labels = {
          app = "biletter"
        }
      }

      spec {
        image_pull_secrets {
          name = kubernetes_secret.registry_credentials.metadata[0].name
        }

        container {
          image = "${var.image}:${var.tag}"
          name  = "biletter"

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

          # Database configuration - the 3 required env vars
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

          # Health check
          # readiness_probe {
          #   http_get {
          #     path = "/health"
          #     port = var.container_port
          #   }
          #   initial_delay_seconds = 30
          #   period_seconds        = 10
          #   timeout_seconds       = 5
          #   failure_threshold     = 3
          # }

          # liveness_probe {
          #   http_get {
          #     path = "/health"
          #     port = var.container_port
          #   }
          #   initial_delay_seconds = 60
          #   period_seconds        = 30
          #   timeout_seconds       = 5
          #   failure_threshold     = 3
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

resource "kubernetes_service" "biletter" {
  metadata {
    name      = "biletter"
    namespace = var.namespace
  }

  spec {
    selector = {
      app = "biletter"
    }

    port {
      port        = var.service_port
      target_port = var.container_port
    }

    type = "ClusterIP"
  }
}

# Certificate for TLS
resource "kubernetes_manifest" "biletter_certificate" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "biletter-tls"
      namespace = var.namespace
    }
    spec = {
      secretName = "biletter-tls"
      issuerRef = {
        name = var.cert_issuer_name
        kind = "ClusterIssuer"
      }
      commonName = var.host
      dnsNames   = [var.host]
    }
  }
}

# Middleware to strip the /biletter prefix
resource "kubernetes_manifest" "strip_prefix_middleware" {
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "Middleware"
    metadata = {
      name      = "biletter-strip-prefix"
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
resource "kubernetes_manifest" "biletter_ingressroute" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "biletter-ingressroute"
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
              name = kubernetes_service.biletter.metadata[0].name
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
        secretName = "biletter-tls"
      }
    }
  }
}

# HTTP to HTTPS redirect
resource "kubernetes_manifest" "biletter_redirect" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "biletter-redirect"
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
