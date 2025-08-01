variable "namespace" {
  description = "The Kubernetes namespace to deploy resources into."
  type        = string
  default     = "kafka"
}

variable "kafka_image" {
  description = "The Docker image to use for Kafka. Must support KRaft mode."
  type        = string
  default     = "bitnami/kafka:4.0"
}

variable "storage_class" {
  description = "The Kubernetes StorageClass to use for the persistent volume."
  type        = string
}

variable "storage_size" {
  description = "The size of the persistent volume for Kafka data."
  type        = string
  default     = "10Gi"
}

variable "enable_metrics" {
  description = "Enable Kafka JMX metrics collection"
  type        = bool
  default     = false
}
