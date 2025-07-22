variable "namespace" {
  description = "Kubernetes namespace for telemetry stack"
  type        = string
  default     = "telemetry"
}

variable "cert_issuer_name" {
  description = "Name of the cert-manager cluster issuer"
  type        = string
  default     = "letsencrypt-prod"
}


variable "storage_class" {
  description = "Storage class for persistent volumes"
  type        = string
  default     = "default"
}

variable "enable_ingress" {
  description = "Enable ingress for telemetry services"
  type        = bool
  default     = true
}

# Prometheus variables
variable "enable_prometheus" {
  description = "Enable Prometheus deployment"
  type        = bool
  default     = true
}

variable "prometheus_release_name" {
  description = "Helm release name for Prometheus"
  type        = string
  default     = "prometheus"
}

variable "prometheus_chart_version" {
  description = "Version of the kube-prometheus-stack chart"
  type        = string
  default     = "45.25.0"
}

variable "prometheus_helm_values" {
  description = "Helm values for Prometheus configuration"
  type        = any
  default     = {}
}

variable "prometheus_host" {
  description = "Hostname for Prometheus UI"
  type        = string
  default     = "prometheus.example.com"
}

variable "prometheus_path" {
  description = "Path for Prometheus UI"
  type        = string
  default     = "/prometheus"
}

variable "prometheus_storage_size" {
  description = "Storage size for Prometheus data"
  type        = string
  default     = "10Gi"
}

variable "enable_alertmanager" {
  description = "Enable Alertmanager"
  type        = bool
  default     = true
}

variable "alertmanager_host" {
  description = "Hostname for Alertmanager UI"
  type        = string
  default     = "alertmanager.example.com"
}

variable "alertmanager_storage_size" {
  description = "Storage size for Alertmanager data"
  type        = string
  default     = "2Gi"
}

# Grafana variables
variable "enable_grafana" {
  description = "Enable Grafana deployment"
  type        = bool
  default     = true
}

variable "grafana_release_name" {
  description = "Helm release name for Grafana"
  type        = string
  default     = "grafana"
}

variable "grafana_chart_version" {
  description = "Version of the Grafana chart"
  type        = string
  default     = "6.50.7"
}

variable "grafana_helm_values" {
  description = "Helm values for Grafana configuration"
  type        = any
  default     = {}
}

variable "grafana_host" {
  description = "Hostname for Grafana UI"
  type        = string
  default     = "grafana.example.com"
}

variable "grafana_path" {
  description = "Path for Grafana UI"
  type        = string
  default     = "/grafana"
}

variable "grafana_admin_password" {
  description = "Admin password for Grafana"
  type        = string
  sensitive   = true
  default     = "admin"
}

variable "grafana_admin_user" {
  description = "Admin user for Grafana"
  type        = string
  default     = "admin"
}

variable "grafana_storage_size" {
  description = "Storage size for Grafana data"
  type        = string
  default     = "10Gi"
}

variable "enable_default_dashboards" {
  description = "Enable default Kubernetes dashboards"
  type        = bool
  default     = true
}

variable "prometheus_url" {
  description = "URL of Prometheus server for Grafana data source"
  type        = string
  default     = ""
}

variable "enable_anonymous_access" {
  description = "Enable anonymous access to Grafana"
  type        = bool
  default     = false
}