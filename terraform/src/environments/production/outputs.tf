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

output "postgres_replica_service_name" {
  description = "Название сервиса реплики PostgreSQL"
  value       = module.cloudnative_pg.replica_service_name
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

output "app_autoscaling_status" {
  description = "Статус автомасштабирования приложения"
  value = var.app_autoscaling_enabled ? {
    enabled = true
    min_replicas = var.app_min_replicas
    max_replicas = var.app_max_replicas
    target_cpu = var.app_target_cpu_utilization
    target_memory = var.app_target_memory_utilization
  } : {
    enabled = false
    replicas = var.app_replicas
  }
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

output "prometheus_replicas" {
  description = "Количество реплик Prometheus"
  value       = var.prometheus_replicas
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

output "grafana_replicas" {
  description = "Количество реплик Grafana"
  value       = var.grafana_replicas
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

# Информация о высокой доступности
output "high_availability_status" {
  description = "Статус высокой доступности компонентов"
  value = {
    kubernetes_nodes = var.node_count
    postgres_instances = var.postgres_instances
    app_replicas = var.app_replicas
    app_autoscaling = var.app_autoscaling_enabled
    prometheus_replicas = var.prometheus_replicas
    grafana_replicas = var.grafana_replicas
  }
}

# Информация о ресурсах
output "resource_allocation" {
  description = "Распределение ресурсов в production среде"
  value = {
    cluster = {
      node_count = var.node_count
      node_type = var.node_instance_type
    }
    storage = {
      postgres_storage = var.postgres_storage_size
      prometheus_storage = var.prometheus_storage_size
      grafana_storage = var.grafana_storage_size
    }
    retention = {
      postgres_backup = var.postgres_backup_retention
      prometheus_data = var.prometheus_retention_time
    }
  }
}
