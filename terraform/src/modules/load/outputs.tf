output "namespace" {
  description = "Kubernetes namespace where the load application is deployed"
  value       = kubernetes_namespace.load.metadata[0].name
}

output "service_name" {
  description = "Name of the load application service"
  value       = kubernetes_service.load.metadata[0].name
}

output "service_port" {
  description = "Port of the load application service"
  value       = var.service_port
}

output "host" {
  description = "Hostname for the load application"
  value       = var.host
}

output "path_prefix" {
  description = "Path prefix for the load application"
  value       = var.path_prefix
}

output "url" {
  description = "Full URL for the load application"
  value       = var.enable_tls ? "https://${var.host}${var.path_prefix}" : "http://${var.host}${var.path_prefix}"
}

output "service_account_name" {
  description = "Name of the service account used by the load application"
  value       = kubernetes_service_account.load.metadata[0].name
}