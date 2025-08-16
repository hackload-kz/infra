output "kafka_bootstrap_server" {
  description = "Kafka bootstrap server endpoint"
  value       = module.kafka.kafka_bootstrap_server_internal
}

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

output "service_provider_namespace" {
  description = "Kubernetes namespace for the service-provider"
  value       = module.service_provider.namespace
}

output "service_provider_service_name" {
  description = "Kubernetes service name for the service-provider"
  value       = module.service_provider.service_name
}