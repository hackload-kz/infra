output "namespace" {
  description = "The namespace where Traefik is installed"
  value       = kubernetes_namespace.traefik.metadata[0].name
}

output "helm_release_name" {
  description = "The name of the Traefik Helm release"
  value       = helm_release.traefik.name
}

output "helm_release_version" {
  description = "The version of the Traefik Helm release"
  value       = helm_release.traefik.version
}

output "service_name" {
  description = "The name of the Traefik service"
  value       = "traefik"
}

output "service_namespace" {
  description = "The namespace of the Traefik service"
  value       = kubernetes_namespace.traefik.metadata[0].name
}

output "dashboard_url" {
  description = "URL for the Traefik dashboard (if enabled and host configured)"
  value       = var.enable_dashboard && var.dashboard_host != "" ? "https://${var.dashboard_host}" : null
}

output "web_port" {
  description = "HTTP port for Traefik"
  value       = var.web_port
}

output "websecure_port" {
  description = "HTTPS port for Traefik"
  value       = var.websecure_port
}

output "load_balancer_ip" {
  description = "Load balancer IP (if service type is LoadBalancer)"
  value       = var.service_type == "LoadBalancer" ? "Check Kubernetes service for IP" : null
}
