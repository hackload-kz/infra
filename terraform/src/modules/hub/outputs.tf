output "namespace" {
  description = "Namespace where the hub application is deployed"
  value       = kubernetes_namespace.hub.metadata[0].name
}

output "service_name" {
  description = "Name of the hub service"
  value       = kubernetes_service.hub.metadata[0].name
}

output "deployment_name" {
  description = "Name of the hub deployment"
  value       = kubernetes_deployment.hub.metadata[0].name
}

output "url" {
  description = "URL for the hub application"
  value       = var.enable_tls ? "https://${var.host}" : "http://${var.host}"
}

output "image_full" {
  description = "Full image name with tag"
  value       = "${var.image}:${var.tag}"
}
