# Create traefik namespace
resource "kubernetes_namespace" "traefik" {
  metadata {
    name = var.namespace
    labels = {
      name = var.namespace
    }
  }
}

# Install Traefik using Helm
resource "helm_release" "traefik" {
  name       = "traefik"
  repository = "https://traefik.github.io/charts"
  chart      = "traefik"
  version    = var.traefik_version
  namespace  = kubernetes_namespace.traefik.metadata[0].name

  values = [
    yamlencode({
      deployment = {
        replicas = var.replicas
      }
      
      service = {
        type = var.service_type
        annotations = var.service_annotations
        spec = {
          loadBalancerSourceRanges = var.load_balancer_source_ranges
        }
      }

      ports = {
        web = {
          port = 8080
          expose = true
          exposedPort = var.web_port
        }
        websecure = {
          port = 8443
          expose = true
          exposedPort = var.websecure_port
          tls = {
            enabled = true
          }
        }
        traefik = {
          port = 9000
          expose = var.expose_dashboard
          exposedPort = var.dashboard_port
        }
      }

      ingressRoute = {
        dashboard = {
          enabled = var.enable_dashboard
          annotations = var.dashboard_annotations
          labels = var.dashboard_labels
        }
      }

      providers = {
        kubernetesCRD = {
          enabled = true
          allowCrossNamespace = var.allow_cross_namespace
          allowExternalNameServices = var.allow_external_name_services
        }
        kubernetesIngress = {
          enabled = var.enable_k8s_ingress
          allowExternalNameServices = var.allow_external_name_services
          publishedService = {
            enabled = true
          }
        }
      }

      globalArguments = var.global_arguments

      additionalArguments = var.additional_arguments

      env = var.env_vars

      resources = var.resources

      nodeSelector = var.node_selector

      tolerations = var.tolerations

      affinity = var.affinity

      securityContext = var.security_context

      podSecurityContext = var.pod_security_context

      persistence = var.persistence
    })
  ]

  depends_on = [kubernetes_namespace.traefik]
}

# Create IngressRoute for dashboard if enabled
resource "kubernetes_manifest" "dashboard_ingressroute" {
  count = var.enable_dashboard && var.dashboard_host != "" ? 1 : 0

  manifest = {
    apiVersion = "traefik.containo.us/v1alpha1"
    kind       = "IngressRoute"
    metadata = {
      name      = "traefik-dashboard"
      namespace = kubernetes_namespace.traefik.metadata[0].name
    }
    spec = {
      entryPoints = ["websecure"]
      routes = [
        {
          match = "Host(`${var.dashboard_host}`)"
          kind  = "Rule"
          services = [
            {
              name = "api@internal"
              kind = "TraefikService"
            }
          ]
        }
      ]
      tls = var.dashboard_tls_enabled ? {
        certResolver = var.dashboard_cert_resolver
      } : null
    }
  }

  depends_on = [helm_release.traefik]
}
