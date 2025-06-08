# Общие выходы
output "environment" {
  description = "Название среды"
  value       = var.environment
}

output "cluster_name" {
  description = "Название кластера Kubernetes"
  value       = module.k8s_cluster.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint кластера Kubernetes"
  value       = module.k8s_cluster.cluster_endpoint
  sensitive   = true
}

# Выходы PostgreSQL
output "postgres_cluster_name" {
  description = "Название кластера PostgreSQL"
  value       = module.cloudnative_pg.cluster_name
}

output "postgres_connection_string" {
  description = "Строка подключения к PostgreSQL"
  value       = module.cloudnative_pg.connection_string
  sensitive   = true
}

output "postgres_service_name" {
  description = "Название сервиса PostgreSQL"
  value       = module.cloudnative_pg.service_name
}

# Выходы приложения HackLoad
output "app_namespace" {
  description = "Namespace приложения HackLoad"
  value       = module.hackload_app.namespace
}

output "app_service_name" {
  description = "Название сервиса приложения HackLoad"
  value       = module.hackload_app.service_name
}

output "app_service_url" {
  description = "URL сервиса приложения HackLoad"
  value       = module.hackload_app.service_url
}

output "app_ingress_url" {
  description = "URL Ingress приложения HackLoad"
  value       = var.app_ingress_enabled ? "https://${var.app_ingress_host}" : null
}

# Выходы K6 Operator
output "k6_operator_namespace" {
  description = "Namespace K6 Operator"
  value       = module.k6_operator.namespace
}

output "k6_operator_version" {
  description = "Версия K6 Operator"
  value       = module.k6_operator.version
}

# Выходы Prometheus
output "prometheus_namespace" {
  description = "Namespace Prometheus"
  value       = module.prometheus.namespace
}

output "prometheus_service_name" {
  description = "Название сервиса Prometheus"
  value       = module.prometheus.service_name
}

output "prometheus_service_url" {
  description = "URL сервиса Prometheus"
  value       = module.prometheus.service_url
}

# Выходы Grafana
output "grafana_namespace" {
  description = "Namespace Grafana"
  value       = module.grafana.namespace
}

output "grafana_service_name" {
  description = "Название сервиса Grafana"
  value       = module.grafana.service_name
}

output "grafana_service_url" {
  description = "URL сервиса Grafana"
  value       = module.grafana.service_url
}

output "grafana_ingress_url" {
  description = "URL Ingress Grafana"
  value       = var.grafana_ingress_enabled ? "https://${var.grafana_ingress_host}" : null
}

output "grafana_admin_user" {
  description = "Имя пользователя администратора Grafana"
  value       = module.grafana.admin_user
}

# Информация для подключения
output "connection_info" {
  description = "Информация для подключения к компонентам"
  value = {
    hackload_app = var.app_ingress_enabled ? "https://${var.app_ingress_host}" : module.hackload_app.service_url
    grafana      = var.grafana_ingress_enabled ? "https://${var.grafana_ingress_host}" : module.grafana.service_url
    prometheus   = module.prometheus.service_url
  }
}
