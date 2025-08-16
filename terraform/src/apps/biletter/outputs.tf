output "postgres_host" {
  description = "PostgreSQL cluster host"
  value       = module.cnpg_cluster.host
}

output "postgres_port" {
  description = "PostgreSQL cluster port"
  value       = module.cnpg_cluster.port
}

output "postgres_username" {
  description = "PostgreSQL cluster username"
  value       = module.cnpg_cluster.username
}

output "biletter_namespace" {
  description = "Kubernetes namespace for the biletter"
  value       = module.biletter.namespace
}

output "biletter_service_name" {
  description = "Kubernetes service name for the biletter"
  value       = module.biletter.service_name
}

output "biletter_external_url" {
  description = "External URL for the biletter"
  value       = module.biletter.external_url
}