resource "kubernetes_namespace" "cnpg-cluster" {
  metadata {
    name = var.namespace
  }
}

resource "random_string" "password" {
  length  = 16
  special = false
}

resource "kubernetes_secret" "cnpg-cluster" {
  metadata {
    name      = "cnpg-cluster"
    namespace = kubernetes_namespace.cnpg-cluster.metadata[0].name
  }

  type = "kubernetes.io/basic-auth"

  data = {
    username = var.username
    password = random_string.password.result
  }
}

resource "kubernetes_manifest" "cnpg-cluster" {
  manifest = yamldecode(templatefile("${path.module}/crd/postgres-cluster.yaml", {
    namespace            = kubernetes_namespace.cnpg-cluster.metadata[0].name,
    storage_class        = var.storage_class,
    storage_size         = var.storage_size,
    instances            = var.instances,
    backup_destination   = var.backup_destination,
    backup_retention     = var.backup_retention,
    username             = var.username,
    user_password_secret = kubernetes_secret.cnpg-cluster.metadata[0].name,
  }))
}

resource "kubernetes_manifest" "cnpg-role" {
  manifest = yamldecode(templatefile("${path.module}/crd/postgres-cluster-role.yaml", {
    namespace = kubernetes_namespace.cnpg-cluster.metadata[0].name,
  }))
}

resource "kubernetes_manifest" "cnpg-role-binding" {
  manifest = yamldecode(templatefile("${path.module}/crd/postgres-cluster-role-binding.yaml", {
    namespace = kubernetes_namespace.cnpg-cluster.metadata[0].name,
  }))
}

resource "kubernetes_manifest" "cnpg-scheduled-backup" {
  manifest = yamldecode(templatefile("${path.module}/crd/scheduled-backup.yaml", {
    namespace       = kubernetes_namespace.cnpg-cluster.metadata[0].name,
    backup_schedule = var.backup_schedule,
  }))
}
