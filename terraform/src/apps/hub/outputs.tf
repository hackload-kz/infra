output "traefik_namespace" {
  description = "Namespace where Traefik is installed"
  value       = module.traefik.namespace
}

output "traefik_service_name" {
  description = "Name of the Traefik service"
  value       = module.traefik.service_name
}

output "traefik_load_balancer_ip" {
  description = "Load balancer IP for Traefik (if applicable)"
  value       = module.traefik.load_balancer_ip
}

output "traefik_dashboard_url" {
  description = "URL for Traefik dashboard"
  value       = module.traefik.dashboard_url
}

# Hub outputs
output "hub_namespace" {
  description = "Namespace where Hub is deployed"
  value       = module.hub.namespace
}

output "hub_service_name" {
  description = "Name of the Hub service"
  value       = module.hub.service_name
}

output "hub_url" {
  description = "URL for the Hub application"
  value       = module.hub.url
}

output "hub_image" {
  description = "Full Hub image name with tag"
  value       = module.hub.image_full
}
