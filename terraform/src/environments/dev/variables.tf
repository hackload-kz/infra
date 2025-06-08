# Переменные для окружения разработки

variable "cluster_name" {
  description = "Имя Kubernetes кластера"
  type        = string
  default     = "hackload-dev"
}

variable "environment" {
  description = "Имя окружения"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "Регион облачного провайдера"
  type        = string
  default     = "us-west-2"
}

variable "node_count" {
  description = "Количество узлов в кластере"
  type        = number
  default     = 1
}

variable "node_instance_type" {
  description = "Тип инстанса для узлов кластера"
  type        = string
  default     = "t3.medium"
}

variable "enable_monitoring" {
  description = "Включить мониторинг (Prometheus/Grafana)"
  type        = bool
  default     = true
}

variable "enable_load_testing" {
  description = "Включить компоненты нагрузочного тестирования"
  type        = bool
  default     = true
}

variable "database_storage_size" {
  description = "Размер хранилища базы данных"
  type        = string
  default     = "20Gi"
}

variable "prometheus_storage_size" {
  description = "Размер хранилища Prometheus"
  type        = string
  default     = "20Gi"
}

variable "prometheus_retention" {
  description = "Время хранения метрик Prometheus"
  type        = string
  default     = "7d"
}

variable "max_concurrent_tests" {
  description = "Максимальное количество одновременных тестов"
  type        = number
  default     = 2
}

variable "tags" {
  description = "Теги для всех ресурсов"
  type        = map(string)
  default = {
    Project     = "HackLoad2025"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}
