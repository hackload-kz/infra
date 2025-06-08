# Выходные параметры для окружения разработки

output "cluster_info" {
  description = "Информация о Kubernetes кластере"
  value = {
    cluster_id       = module.k8s_cluster.cluster_id
    cluster_endpoint = module.k8s_cluster.cluster_endpoint
    cluster_name     = var.cluster_name
  }
}

output "database_info" {
  description = "Информация о базе данных"
  value = {
    cluster_name     = module.cloudnative_pg.cluster_name
    connection_host  = module.cloudnative_pg.cluster_rw_service
    database_name    = "hackload"
  }
  sensitive = true
}

output "application_info" {
  description = "Информация о веб-приложении"
  value = {
    service_name = module.hackload_app.service_name
    service_port = module.hackload_app.service_port
    namespace    = "hackload"
  }
}

output "monitoring_info" {
  description = "Информация о мониторинге"
  value = {
    prometheus_url = module.prometheus.prometheus_url
    grafana_url    = module.grafana.grafana_url
    namespace      = "monitoring"
  }
}

output "k6_operator_info" {
  description = "Информация о K6 операторе"
  value = {
    namespace           = "k6-operator-system"
    max_concurrent_tests = var.max_concurrent_tests
    operator_status     = "deployed"
  }
}

output "quick_access" {
  description = "Быстрый доступ к сервисам (для разработки)"
  value = {
    kubectl_context = "${var.cluster_name}-context"
    port_forwards = {
      grafana     = "kubectl port-forward -n monitoring svc/grafana 3000:80"
      prometheus  = "kubectl port-forward -n monitoring svc/prometheus 9090:9090"
      hackload_app = "kubectl port-forward -n hackload svc/${module.hackload_app.service_name} 8080:80"
    }
  }
}
