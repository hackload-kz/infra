output "namespace" {
  description = "The namespace where service-provider was deployed"
  value       = var.namespace
}

output "service_name" {
  description = "The name of the Kubernetes service for service-provider"
  value       = kubernetes_service.service_provider.metadata[0].name
}

output "service_url" {
  description = "The internal service URL for service-provider"
  value       = "http://${kubernetes_service.service_provider.metadata[0].name}.${var.namespace}.svc.cluster.local:${var.service_port}"
}

output "external_url" {
  description = "The external URL for service-provider"
  value       = var.enable_tls ? "https://${var.host}${var.path_prefix}" : "http://${var.host}${var.path_prefix}"
}
