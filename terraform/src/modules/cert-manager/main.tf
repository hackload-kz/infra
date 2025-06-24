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

# Create ClusterIssuer after cert-manager is installed
resource "kubernetes_manifest" "cluster_issuer" {
  count = var.create_cluster_issuer ? 1 : 0
  
  manifest = yamldecode(templatefile("${path.module}/crd/cluster_issuer.yml.tpl", {
    acme_email = var.acme_email,
    cluster_issuer = var.cluster_issuer_name,
    acme_server = var.acme_server
  }))

  depends_on = [helm_release.cert_manager]
}

# Create staging ClusterIssuer for testing
resource "kubernetes_manifest" "cluster_issuer_staging" {
  count = var.create_staging_issuer ? 1 : 0
  
  manifest = yamldecode(templatefile("${path.module}/crd/cluster_issuer_staging.yml.tpl", {
    acme_email = var.acme_email,
    cluster_issuer = var.cluster_issuer_name,
    acme_server = var.acme_staging_server
  }))

  depends_on = [helm_release.cert_manager]
}

# ServiceAccount for ACME HTTP solver
resource "kubernetes_service_account" "cert_manager_acme_http_solver" {
  metadata {
    name      = "cert-manager-acme-http-solver"
    namespace = kubernetes_namespace.cert_manager.metadata[0].name
  }
}

# ClusterRole for ACME HTTP solver PSP access
resource "kubernetes_cluster_role" "cert_manager_acme_http_solver_psp" {
  metadata {
    name = "cert-manager-acme-http-solver-psp"
  }

  rule {
    api_groups     = ["policy"]
    resources      = ["podsecuritypolicies"]
    resource_names = ["magnum.privileged"]
    verbs          = ["use"]
  }
}

# ClusterRoleBinding for ACME HTTP solver PSP access
resource "kubernetes_cluster_role_binding" "cert_manager_acme_http_solver_psp" {
  metadata {
    name = "cert-manager-acme-http-solver-psp"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.cert_manager_acme_http_solver_psp.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.cert_manager_acme_http_solver.metadata[0].name
    namespace = kubernetes_namespace.cert_manager.metadata[0].name
  }

  # Also bind to the default service account in any namespace for solver pods
  subject {
    kind      = "ServiceAccount"
    name      = "default"
    namespace = "nginx"
  }
}

# RoleBinding for cert-manager service account PSP access
resource "kubernetes_cluster_role_binding" "cert_manager_psp" {
  metadata {
    name = "cert-manager-psp"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.cert_manager_acme_http_solver_psp.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = "cert-manager"
    namespace = kubernetes_namespace.cert_manager.metadata[0].name
  }
}
