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

output "payment_provider_namespace" {
  description = "Kubernetes namespace for the payment-provider"
  value       = module.payment_provider.namespace
}

output "payment_provider_service_name" {
  description = "Kubernetes service name for the payment-provider"
  value       = module.payment_provider.service_name
}

output "payment_provider_external_url" {
  description = "External URL for the payment-provider"
  value       = module.payment_provider.external_url
}