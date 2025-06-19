# Create cert-manager namespace
resource "kubernetes_namespace" "cert_manager" {
  metadata {
    name = var.namespace
    labels = {
      "cert-manager.io/disable-validation" = "true"
    }
  }
}

resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  version    = var.cert_manager_version
  namespace  = kubernetes_namespace.cert_manager.metadata[0].name

  values = [
    yamlencode({
      installCRDs = true
      global = {
        leaderElection = {
          namespace = var.namespace
        }
      }
      securityContext = {
        runAsNonRoot = true
      }
      resources = var.resources
      nodeSelector = var.node_selector
      tolerations = var.tolerations
      affinity = var.affinity
    })
  ]

  depends_on = [kubernetes_namespace.cert_manager]
}

# resource "kubernetes_manifest" "cluster_issuer" {
#   count = var.create_cluster_issuer ? 1 : 0
  
#   manifest = yamldecode(templatefile("${path.module}/crd/cluster_issuer.yml.tpl", {
#     acme_email = var.acme_email,
#     cluster_issuer = var.cluster_issuer_name,
#     acme_server = var.acme_server
#   }))

#   depends_on = [helm_release.cert_manager]
# }

# resource "kubernetes_manifest" "cluster_issuer_staging" {
#   count = var.create_staging_issuer ? 1 : 0
  
#   manifest = yamldecode(templatefile("${path.module}/crd/cluster_issuer_staging.yml.tpl", {
#     acme_email = var.acme_email,
#     cluster_issuer = var.cluster_issuer_name,
#     acme_server = var.acme_staging_server
#   }))

#   depends_on = [helm_release.cert_manager]
# }
