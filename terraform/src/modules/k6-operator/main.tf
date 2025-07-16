resource "kubernetes_namespace" "k6_namespace" {
  metadata {
    name = var.namespace
  } 
}

resource "helm_release" "k6_operator" {
  name             = var.release_name
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "k6-operator"
  version          = var.chart_version
  namespace        = kubernetes_namespace.k6_namespace.metadata[0].name
  create_namespace = false

  values = [
    var.values_yaml
  ]

  dynamic "set" {
    for_each = var.helm_values
    content {
      name  = set.key
      value = set.value
    }
  }
}

# Create a basic RBAC if enabled
resource "kubernetes_service_account" "k6_tests" {
  count = var.create_test_service_account ? 1 : 0

  metadata {
    name      = "k6-tests"
    namespace = helm_release.k6_operator.namespace
  }
}

resource "kubernetes_cluster_role" "k6_test_runner" {
  count = var.create_test_service_account ? 1 : 0

  metadata {
    name = "k6-test-runner"
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "services", "endpoints"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["apps"]
    resources  = ["deployments", "replicasets"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["metrics.k8s.io"]
    resources  = ["pods", "nodes"]
    verbs      = ["get", "list"]
  }
}

resource "kubernetes_cluster_role_binding" "k6_test_runner" {
  count = var.create_test_service_account ? 1 : 0

  metadata {
    name = "k6-test-runner"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.k6_test_runner[0].metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.k6_tests[0].metadata[0].name
    namespace = kubernetes_namespace.k6_namespace.metadata[0].name
  }
}
