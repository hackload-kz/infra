output "kafka_bootstrap_server_internal" {
  description = "The internal Kafka bootstrap server address for clients to connect to from within the cluster."
  value       = "${kubernetes_service.kafka_client.metadata[0].name}.${var.namespace}.svc.cluster.local:9092"
}

output "kafka_namespace" {
  description = "The namespace where Kafka was deployed."
  value       = var.namespace
}
