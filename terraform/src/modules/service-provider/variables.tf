variable "namespace" {
  description = "The Kubernetes namespace to deploy the service-provider into"
  type        = string
  default     = "service-provider"
}

variable "image" {
  description = "The Docker image for the service-provider"
  type        = string
  default     = "ghcr.io/hackload-kz/service-provider"
}

variable "tag" {
  description = "The Docker image tag for the service-provider"
  type        = string
  default     = "latest"
}

variable "replicas" {
  description = "Number of replicas for the service-provider deployment"
  type        = number
  default     = 1
}

variable "container_port" {
  description = "The port the service-provider container listens on"
  type        = number
  default     = 8080
}

variable "service_port" {
  description = "The port the Kubernetes service exposes"
  type        = number
  default     = 80
}

variable "registry_credentials" {
  description = "Docker registry credentials"
  type = object({
    server   = string
    username = string
    password = string
    email    = string
  })
}

variable "resources" {
  description = "Resource requests and limits for the service-provider container"
  type = object({
    requests = object({
      cpu    = string
      memory = string
    })
    limits = object({
      cpu    = string
      memory = string
    })
  })
  default = {
    requests = {
      cpu    = "200m"
      memory = "256Mi"
    }
    limits = {
      cpu    = "500m"
      memory = "512Mi"
    }
  }
}

# Database configuration
variable "db_jdbc_url" {
  description = "JDBC URL for PostgreSQL database connection"
  type        = string
}

variable "db_jdbc_user" {
  description = "PostgreSQL database username"
  type        = string
}

variable "db_jdbc_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}

variable "db_connection_pool_size" {
  description = "Database connection pool size"
  type        = number
  default     = 16
}

# Kafka configuration
variable "kafka_bootstrap_servers" {
  description = "Kafka bootstrap servers"
  type        = string
}

variable "kafka_consumer_group_id" {
  description = "Kafka consumer group ID"
  type        = string
  default     = "service-provider"
}

# Traefik routing configuration
variable "host" {
  description = "The hostname for the service-provider"
  type        = string
}

variable "path_prefix" {
  description = "The path prefix for the service-provider"
  type        = string
  default     = "/service-provider"
}

variable "enable_tls" {
  description = "Whether to enable TLS/SSL"
  type        = bool
  default     = true
}

variable "cert_issuer_name" {
  description = "The name of the cert-manager ClusterIssuer to use for TLS certificates"
  type        = string
}

variable "enable_metrics" {
  type    = bool
  default = false
}
