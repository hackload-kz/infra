resource "kubernetes_manifest" "cnpg-namespace" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/namespace.yaml"))
}

resource "kubernetes_manifest" "cnpg-backups-crd" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/backups-crd.yaml"))
}

resource "kubernetes_manifest" "cnpg-clusterimagecatalogs-crd" {
  computed_fields = ["spec.versions"]
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/clusterimagecatalogs-crd.yaml"))
}

resource "kubernetes_manifest" "cnpg-clusters-crd" {
  computed_fields = ["spec.versions"]
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/clusters-crd.yaml"))
}

resource "kubernetes_manifest" "cnpg-databases-crd" {
  computed_fields = ["spec.versions"]
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/databases-crd.yaml"))
}

resource "kubernetes_manifest" "cnpg-imagecatalogs-crd" {
  computed_fields = ["spec.versions"]
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/imagecatalogs-crd.yaml"))
}

resource "kubernetes_manifest" "cnpg-poolers-crd" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/poolers-crd.yaml"))
}

resource "kubernetes_manifest" "cnpg-publications-crd" {
  computed_fields = ["spec.versions"]
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/publications-crd.yaml"))
}

resource "kubernetes_manifest" "cnpg-scheduledbackups-crd" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/scheduledbackups-crd.yaml"))
}

resource "kubernetes_manifest" "cnpg-subscriptions-crd" {
  computed_fields = ["spec.versions"]
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/subscriptions-crd.yaml"))
}

resource "kubernetes_manifest" "cnpg-sa" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/sa.yaml"))
}

resource "kubernetes_manifest" "cnpg-database-editor-role" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/database-editor-role.yaml"))
}

resource "kubernetes_manifest" "cnpg-database-viewer-role" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/database-viewer-role.yaml"))
}

resource "kubernetes_manifest" "cnpg-manager-role" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/manager-role.yaml"))
}

resource "kubernetes_manifest" "cnpg-publication-editor-role" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/publication-editor-role.yaml"))
}

resource "kubernetes_manifest" "cnpg-publication-viewer-role" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/publication-viewer-role.yaml"))
}

resource "kubernetes_manifest" "cnpg-subscription-editor-role" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/subscription-editor-role.yaml"))
}

resource "kubernetes_manifest" "cnpg-subscription-viewer-role" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/subscription-viewer-role.yaml"))
}

resource "kubernetes_manifest" "cnpg-manager-rolebinding" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/manager-rolebinding.yaml"))
}

resource "kubernetes_manifest" "cnpg-default-monitoring-cm" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/default-monitoring-cm.yaml"))
}

resource "kubernetes_manifest" "cnpg-webhook-service" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/webhook-service.yaml"))
}

resource "kubernetes_manifest" "cnpg-controller-manager" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/controller-manager.yaml"))
}

resource "kubernetes_manifest" "cnpg-mutating-webhook-configuration" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/mutating-webhook-configuration.yaml"))
}

resource "kubernetes_manifest" "cnpg-validating-webhook-configuration" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/validating-webhook-configuration.yaml"))
}

resource "kubernetes_manifest" "cnpg-psp" {
  computed_fields = [
    "spec.privileged",
    "spec.hostPID",
    "spec.hostNetwork",
    "spec.readOnlyRootFilesystem",
    "spec.hostIPC"
  ]
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/psp.yaml"))
}

resource "kubernetes_manifest" "cnpg-psp-role" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/psp-role.yaml"))
}

resource "kubernetes_manifest" "cnpg-psp-rolebinding" {
  manifest = yamldecode(file("${path.module}/manifests/cnpg-1.25.0/psp-rolebinding.yaml"))
}
