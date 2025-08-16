output "namespace" {
  description = "The namespace where biletter was deployed"
  value       = var.namespace
}

output "service_name" {
  description = "The name of the Kubernetes service for biletter"
  value       = kubernetes_service.biletter.metadata[0].name
}

output "service_url" {
  description = "The internal service URL for biletter"
  value       = "http://${kubernetes_service.biletter.metadata[0].name}.${var.namespace}.svc.cluster.local:${var.service_port}"
}

output "external_url" {
  description = "The external URL for biletter"
  value       = var.enable_tls ? "https://${var.host}${var.path_prefix}" : "http://${var.host}${var.path_prefix}"
}