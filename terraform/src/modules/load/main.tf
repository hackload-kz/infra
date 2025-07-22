resource "kubernetes_namespace" "load" {
  metadata {
    name = var.namespace
  }
}

# Service Account for the load application
resource "kubernetes_service_account" "load" {
  metadata {
    name      = "load-app"
    namespace = kubernetes_namespace.load.metadata[0].name
  }
}

# ClusterRole with minimal permissions for k6 operations only
resource "kubernetes_cluster_role" "load_k6" {
  metadata {
    name = "load-k6-operator"
  }

  rule {
    api_groups = ["k6.io"]
    resources  = ["k6s"]
    verbs      = ["create", "get", "list", "watch"]
  }

  rule {
    api_groups = [""]
    resources  = ["configmaps"]
    verbs      = ["create", "get"]
    # Restrict to k6-system namespace through RBAC policies
  }
}

# ClusterRoleBinding to bind the service account to the k6 role
resource "kubernetes_cluster_role_binding" "load_k6" {
  metadata {
    name = "load-k6-operator"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.load_k6.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.load.metadata[0].name
    namespace = kubernetes_namespace.load.metadata[0].name
  }
}

# Registry secret for pulling images
resource "kubernetes_secret" "registry_credentials" {
  metadata {
    name      = "ghcr-credentials"
    namespace = kubernetes_namespace.load.metadata[0].name
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

# Deployment for the load application
resource "kubernetes_deployment" "load" {
  metadata {
    name      = "load"
    namespace = kubernetes_namespace.load.metadata[0].name
    labels = {
      app = "load"
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = "load"
      }
    }

    template {
      metadata {
        labels = {
          app = "load"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.load.metadata[0].name

        image_pull_secrets {
          name = kubernetes_secret.registry_credentials.metadata[0].name
        }

        container {
          image = "${var.image}:${var.tag}"
          name  = "load"

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
            name  = "NEXTAUTH_URL"
            value = var.nextauth_url
          }

          env {
            name  = "NEXTAUTH_SECRET"
            value = var.nextauth_secret
          }

          env {
            name  = "LOAD_USERNAME"
            value = var.load_username
          }

          env {
            name  = "LOAD_PASSWORD"
            value = var.load_password
          }

          env {
            name  = "K6_NAMESPACE"
            value = var.k6_namespace
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

# Service for the load application
resource "kubernetes_service" "load" {
  metadata {
    name      = "load"
    namespace = kubernetes_namespace.load.metadata[0].name
  }

  spec {
    selector = {
      app = "load"
    }

    port {
      port        = var.service_port
      target_port = var.container_port
    }

    type = "ClusterIP"
  }
}

# Certificate for TLS
resource "kubernetes_manifest" "load_certificate" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"
    metadata = {
      name      = "load-tls"
      namespace = kubernetes_namespace.load.metadata[0].name
    }
    spec = {
      secretName = "load-tls"
      issuerRef = {
        name = var.cert_issuer_name
        kind = "ClusterIssuer"
      }
      commonName = var.host
      dnsNames   = [var.host]
    }
  }
}

# IngressRoute for the load application
resource "kubernetes_manifest" "load_ingressroute" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "load-ingressroute"
      namespace = kubernetes_namespace.load.metadata[0].name
    }
    spec = {
      entryPoints = ["websecure"]
      routes = [
        {
          match = "Host(`${var.host}`) && PathPrefix(`${var.path_prefix}`)"
          kind  = "Rule"
          services = [
            {
              name = kubernetes_service.load.metadata[0].name
              port = var.service_port
            }
          ]
          # middlewares = var.path_prefix != "/" ? [
          #   {
          #     name = kubernetes_manifest.load_stripprefix[0].manifest.metadata.name
          #   }
          # ] : []
        }
      ]
      tls = {
        secretName = "load-tls"
      }
    }
  }
}

# StripPrefix middleware if using a path prefix
# resource "kubernetes_manifest" "load_stripprefix" {
#   count = var.enable_tls && var.path_prefix != "/" ? 1 : 0

#   manifest = {
#     apiVersion = "traefik.containo.us/v1alpha1"
#     kind       = "Middleware"
#     metadata = {
#       name      = "load-stripprefix"
#       namespace = kubernetes_namespace.load.metadata[0].name
#     }
#     spec = {
#       stripPrefix = {
#         prefixes = [var.path_prefix]
#       }
#     }
#   }
# }

# HTTP to HTTPS redirect
resource "kubernetes_manifest" "load_redirect" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "load-redirect"
      namespace = kubernetes_namespace.load.metadata[0].name
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
              name = kubernetes_manifest.redirect_middleware[0].manifest.metadata.name
            }
          ]
        }
      ]
    }
  }
}

# HTTPS redirect middleware
resource "kubernetes_manifest" "redirect_middleware" {
  count = var.enable_tls ? 1 : 0
  
  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "Middleware"
    metadata = {
      name      = "redirect-to-https"
      namespace = kubernetes_namespace.load.metadata[0].name
    }
    spec = {
      redirectScheme = {
        scheme    = "https"
        permanent = true
      }
    }
  }
}
