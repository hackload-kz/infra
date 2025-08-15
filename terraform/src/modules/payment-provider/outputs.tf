output "namespace" {
  description = "The namespace where payment-provider was deployed"
  value       = var.namespace
}

output "service_name" {
  description = "The name of the Kubernetes service for payment-provider"
  value       = kubernetes_service.payment_provider.metadata[0].name
}

output "service_url" {
  description = "The internal service URL for payment-provider"
  value       = "http://${kubernetes_service.payment_provider.metadata[0].name}.${var.namespace}.svc.cluster.local:${var.service_port}"
}

output "external_url" {
  description = "The external URL for payment-provider"
  value       = var.enable_tls ? "https://${var.host}${var.path_prefix}" : "http://${var.host}${var.path_prefix}"
}

output "metrics_url" {
  description = "The internal metrics URL for payment-provider"
  value       = "http://${kubernetes_service.payment_provider.metadata[0].name}.${var.namespace}.svc.cluster.local:${var.metrics_port}/metrics"
}