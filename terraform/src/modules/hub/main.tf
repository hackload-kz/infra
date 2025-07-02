
resource "kubernetes_namespace" "hub" {
  metadata {
    name = var.namespace
  }
}

resource "kubernetes_secret" "registry_credentials" {

  metadata {
    name      = "ghcr-credentials"
    namespace = kubernetes_namespace.hub.metadata[0].name
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

resource "kubernetes_deployment" "hub" {
  metadata {
    name      = "hub"
    namespace = kubernetes_namespace.hub.metadata[0].name
    labels = {
      app = "hub"
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = "hub"
      }
    }

    template {
      metadata {
        labels = {
          app = "hub"
        }
      }

      spec {
        image_pull_secrets {
          name = kubernetes_secret.registry_credentials.metadata[0].name
        }

        container {
          image = "${var.image}:${var.tag}"
          name  = "hub"

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

          env {
            name  = "NODE_ENV"
            value = "production"
          }

          env {
            name  = "PORT"
            value = "${var.container_port}"
          }

          env {
            name  = "DATABASE_URL"
            value = var.db_connection_string
          }

          env {
            name  = "NEXTAUTH_URL"
            value = var.nextauth_url
          }

          env {
            name  = "AUTH_TRUST_HOST"
            value = var.nextauth_url
          }

          env {
            name  = "NEXTAUTH_SECRET"
            value = var.nextauth_secret
          }

          env {
            name  = "GOOGLE_CLIENT_ID"
            value = var.google_client_id
          }

          env {
            name  = "GOOGLE_CLIENT_SECRET"
            value = var.google_client_secret
          }

          env {
            name  = "GITHUB_CLIENT_ID"
            value = var.github_client_id
          }

          env {
            name  = "GITHUB_CLIENT_SECRET"
            value = var.github_client_secret
          }

          env {
            name  = "ADMIN_USERS"
            value = var.admin_users
          }

        #   liveness_probe {
        #     http_get {
        #       path = var.health_check_path
        #       port = var.container_port
        #     }
        #     initial_delay_seconds = 30
        #     period_seconds        = 10
        #   }

        #   readiness_probe {
        #     http_get {
        #       path = var.health_check_path
        #       port = var.container_port
        #     }
        #     initial_delay_seconds = 5
        #     period_seconds        = 5
        #   }
        }
      }
    }
  }
}

resource "kubernetes_service" "hub" {
  metadata {
    name      = "hub"
    namespace = kubernetes_namespace.hub.metadata[0].name
  }

  spec {
    selector = {
      app = "hub"
    }

    port {
      port        = var.service_port
      target_port = var.container_port
    }

    type = "ClusterIP"
  }
}

resource "kubernetes_manifest" "hub_certificate" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "hub-tls"
      namespace = kubernetes_namespace.hub.metadata[0].name
    }
    spec = {
      secretName = "hub-tls"
      issuerRef = {
        name = var.cert_issuer_name
        kind = "ClusterIssuer"
      }
      commonName = var.host
      dnsNames   = [var.host]
    }
  }
}

resource "kubernetes_manifest" "hub_ingressroute" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "hub-ingressroute"
      namespace = kubernetes_namespace.hub.metadata[0].name
    }
    spec = {
      entryPoints = ["websecure"]
      routes = [
        {
          match = "Host(`${var.host}`)"
          kind  = "Rule"
          services = [
            {
              name = kubernetes_service.hub.metadata[0].name
              port = var.service_port
            }
          ]
        }
      ]
      tls = {
        secretName = "hub-tls"
      }
    }
  }
}

resource "kubernetes_manifest" "hub_redirect" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "hub-redirect"
      namespace = kubernetes_namespace.hub.metadata[0].name
    }
    spec = {
      entryPoints = ["web"]
      routes = [
        {
          match = "Host(`${var.host}`)"
          kind  = "Rule"
          services = [
            {
              name = "api@internal"
              kind = "TraefikService"
            }
          ]
          middlewares = [
            {
              name = kubernetes_manifest.redirect_middleware[0].manifest.metadata.name
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
      namespace = kubernetes_namespace.hub.metadata[0].name
    }
    spec = {
      redirectScheme = {
        scheme    = "https"
        permanent = true
      }
    }
  }
}
