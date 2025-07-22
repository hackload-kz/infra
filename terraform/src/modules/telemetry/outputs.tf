output "namespace" {
  description = "Kubernetes namespace where telemetry stack is deployed"
  value       = kubernetes_namespace.telemetry.metadata[0].name
}

# Prometheus outputs
output "prometheus_service_name" {
  description = "Name of the Prometheus service"
  value       = var.enable_prometheus ? "${var.prometheus_release_name}-kube-prometheus-stack-prometheus" : ""
}

output "prometheus_service_port" {
  description = "Port of the Prometheus service"
  value       = 9090
}

output "prometheus_host" {
  description = "Hostname for Prometheus UI"
  value       = var.prometheus_host
}

output "prometheus_path" {
  description = "Path for Prometheus UI"
  value       = var.prometheus_path
}

output "prometheus_url" {
  description = "Full URL for Prometheus UI"
  value       = var.enable_prometheus && var.enable_ingress ? "https://${var.prometheus_host}${var.prometheus_path}" : ""
}

# Alertmanager outputs
output "alertmanager_service_name" {
  description = "Name of the Alertmanager service"
  value       = var.enable_prometheus && var.enable_alertmanager ? "${var.prometheus_release_name}-kube-prometheus-stack-alertmanager" : ""
}

output "alertmanager_service_port" {
  description = "Port of the Alertmanager service"
  value       = 9093
}

output "alertmanager_host" {
  description = "Hostname for Alertmanager UI"
  value       = var.alertmanager_host
}

output "alertmanager_url" {
  description = "Full URL for Alertmanager UI"
  value       = var.enable_prometheus && var.enable_alertmanager && var.enable_ingress ? "https://${var.alertmanager_host}/alertmanager" : ""
}

# Grafana outputs
output "grafana_service_name" {
  description = "Name of the Grafana service"
  value       = var.enable_grafana ? var.grafana_release_name : ""
}

output "grafana_service_port" {
  description = "Port of the Grafana service"
  value       = 80
}

output "grafana_host" {
  description = "Hostname for Grafana UI"
  value       = var.grafana_host
}

output "grafana_path" {
  description = "Path for Grafana UI"
  value       = var.grafana_path
}

output "grafana_url" {
  description = "Full URL for Grafana UI"
  value       = var.enable_grafana && var.enable_ingress ? "https://${var.grafana_host}${var.grafana_path}" : ""
}

output "grafana_admin_user" {
  description = "Grafana admin username"
  value       = var.grafana_admin_user
}

# Internal service URLs for inter-service communication
output "prometheus_internal_url" {
  description = "Internal cluster URL for Prometheus service"
  value       = var.enable_prometheus ? "http://${var.prometheus_release_name}-kube-prometheus-stack-prometheus.${kubernetes_namespace.telemetry.metadata[0].name}.svc.cluster.local:9090" : ""
}

output "grafana_internal_url" {
  description = "Internal cluster URL for Grafana service"
  value       = var.enable_grafana ? "http://${var.grafana_release_name}.${kubernetes_namespace.telemetry.metadata[0].name}.svc.cluster.local:80" : ""
}