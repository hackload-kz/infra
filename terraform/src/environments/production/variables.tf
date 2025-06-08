# Общие переменные
variable "environment" {
  description = "Название среды"
  type        = string
  default     = "production"
}

variable "kubeconfig_path" {
  description = "Путь к файлу kubeconfig"
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Контекст Kubernetes для использования"
  type        = string
  default     = "production-context"
}

variable "common_tags" {
  description = "Общие теги для ресурсов"
  type        = map(string)
  default = {
    Project     = "HackLoad2025"
    Environment = "production"
    ManagedBy   = "Terraform"
    Backup      = "critical"
  }
}

# Переменные кластера Kubernetes
variable "cluster_name" {
  description = "Название кластера Kubernetes"
  type        = string
  default     = "hackload-production"
}

variable "node_count" {
  description = "Количество рабочих узлов"
  type        = number
  default     = 6
}

variable "node_instance_type" {
  description = "Тип экземпляра для рабочих узлов"
  type        = string
  default     = "t3.large"
}

variable "kubernetes_version" {
  description = "Версия Kubernetes"
  type        = string
  default     = "1.28"
}

# Переменные PostgreSQL
variable "postgres_namespace" {
  description = "Namespace для PostgreSQL"
  type        = string
  default     = "database"
}

variable "postgres_instances" {
  description = "Количество экземпляров PostgreSQL"
  type        = number
  default     = 3
}

variable "postgres_storage_size" {
  description = "Размер хранилища PostgreSQL"
  type        = string
  default     = "200Gi"
}

variable "postgres_storage_class" {
  description = "Класс хранилища для PostgreSQL"
  type        = string
  default     = "gp3"
}

variable "postgresql_version" {
  description = "Версия PostgreSQL"
  type        = string
  default     = "15"
}

variable "postgres_backup_enabled" {
  description = "Включить резервное копирование PostgreSQL"
  type        = bool
  default     = true
}

variable "postgres_backup_schedule" {
  description = "Расписание резервного копирования PostgreSQL"
  type        = string
  default     = "0 1 * * *"
}

variable "postgres_backup_retention" {
  description = "Время хранения резервных копий PostgreSQL"
  type        = string
  default     = "30d"
}

variable "postgres_monitoring_enabled" {
  description = "Включить мониторинг PostgreSQL"
  type        = bool
  default     = true
}

# Production PostgreSQL performance settings
variable "postgres_max_connections" {
  description = "Максимальное количество подключений PostgreSQL"
  type        = number
  default     = 200
}

variable "postgres_shared_buffers" {
  description = "Размер shared_buffers PostgreSQL"
  type        = string
  default     = "2GB"
}

variable "postgres_effective_cache_size" {
  description = "Размер effective_cache_size PostgreSQL"
  type        = string
  default     = "6GB"
}

# Переменные приложения HackLoad
variable "app_namespace" {
  description = "Namespace для приложения HackLoad"
  type        = string
  default     = "hackload"
}

variable "app_name" {
  description = "Название приложения HackLoad"
  type        = string
  default     = "hackload-app"
}

variable "app_image_tag" {
  description = "Тег образа приложения HackLoad"
  type        = string
  default     = "latest"
}

variable "app_replicas" {
  description = "Количество реплик приложения HackLoad"
  type        = number
  default     = 5
}

variable "app_ingress_enabled" {
  description = "Включить Ingress для приложения"
  type        = bool
  default     = true
}

variable "app_ingress_host" {
  description = "Хост для Ingress приложения"
  type        = string
  default     = "hackload.example.com"
}

variable "app_ingress_class" {
  description = "Класс Ingress"
  type        = string
  default     = "nginx"
}

# Автомасштабирование приложения
variable "app_autoscaling_enabled" {
  description = "Включить автомасштабирование приложения"
  type        = bool
  default     = true
}

variable "app_min_replicas" {
  description = "Минимальное количество реплик"
  type        = number
  default     = 3
}

variable "app_max_replicas" {
  description = "Максимальное количество реплик"
  type        = number
  default     = 20
}

variable "app_target_cpu_utilization" {
  description = "Целевая утилизация CPU для автомасштабирования (%)"
  type        = number
  default     = 70
}

variable "app_target_memory_utilization" {
  description = "Целевая утилизация памяти для автомасштабирования (%)"
  type        = number
  default     = 80
}

# Переменные K6 Operator
variable "k6_namespace" {
  description = "Namespace для K6 Operator"
  type        = string
  default     = "k6-system"
}

variable "k6_operator_version" {
  description = "Версия K6 Operator"
  type        = string
  default     = "0.0.14"
}

# Переменные мониторинга
variable "monitoring_namespace" {
  description = "Namespace для компонентов мониторинга"
  type        = string
  default     = "monitoring"
}

# Переменные Prometheus
variable "prometheus_storage_size" {
  description = "Размер хранилища Prometheus"
  type        = string
  default     = "500Gi"
}

variable "prometheus_storage_class" {
  description = "Класс хранилища для Prometheus"
  type        = string
  default     = "gp3"
}

variable "prometheus_retention_time" {
  description = "Время хранения данных Prometheus"
  type        = string
  default     = "90d"
}

variable "prometheus_scrape_interval" {
  description = "Интервал сбора метрик Prometheus"
  type        = string
  default     = "15s"
}

variable "prometheus_evaluation_interval" {
  description = "Интервал оценки правил Prometheus"
  type        = string
  default     = "15s"
}

variable "prometheus_replicas" {
  description = "Количество реплик Prometheus для высокой доступности"
  type        = number
  default     = 2
}

# Переменные Grafana
variable "grafana_admin_password" {
  description = "Пароль администратора Grafana"
  type        = string
  sensitive   = true
  default     = "production-secure-password"
}

variable "grafana_storage_size" {
  description = "Размер хранилища Grafana"
  type        = string
  default     = "50Gi"
}

variable "grafana_storage_class" {
  description = "Класс хранилища для Grafana"
  type        = string
  default     = "gp3"
}

variable "grafana_ingress_enabled" {
  description = "Включить Ingress для Grafana"
  type        = bool
  default     = true
}

variable "grafana_ingress_host" {
  description = "Хост для Ingress Grafana"
  type        = string
  default     = "grafana.hackload.example.com"
}

variable "grafana_ingress_class" {
  description = "Класс Ingress для Grafana"
  type        = string
  default     = "nginx"
}

variable "grafana_replicas" {
  description = "Количество реплик Grafana для высокой доступности"
  type        = number
  default     = 2
}
