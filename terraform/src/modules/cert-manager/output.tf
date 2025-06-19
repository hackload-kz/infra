output "namespace" {
  description = "The namespace where cert-manager is installed"
  value       = kubernetes_namespace.cert_manager.metadata[0].name
}

output "helm_release_name" {
  description = "The name of the cert-manager Helm release"
  value       = helm_release.cert_manager.name
}

output "helm_release_version" {
  description = "The version of the cert-manager Helm release"
  value       = helm_release.cert_manager.version
}

output "cluster_issuer_name" {
  description = "The name of the created ClusterIssuer"
  value       = var.create_cluster_issuer ? var.cluster_issuer_name : null
}

output "cluster_issuer_staging_name" {
  description = "The name of the created staging ClusterIssuer"
  value       = var.create_staging_issuer ? "${var.cluster_issuer_name}-staging" : null
}
