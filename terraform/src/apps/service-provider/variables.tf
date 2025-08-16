# Infrastructure variables
variable "namespace" {
  description = "Kubernetes namespace for all service-provider components"
  type        = string
  default     = "service-provider"
}

variable "storage_class" {
  description = "The Kubernetes StorageClass to use for persistent volumes"
  type        = string
  default     = "standard"
}

variable "cnpg_storage_size" {
  description = "Storage size for the PostgreSQL cluster"
  type        = string
  default     = "10Gi"
}

variable "enable_metrics" {
  description = "Enable metrics collection for Kafka and PostgreSQL"
  type        = bool
  default     = false
}

# Service Provider specific variables
variable "service_provider_image" {
  description = "Docker image for the service-provider"
  type        = string
  default     = "ghcr.io/hackload-kz/service-provider"
}

variable "service_provider_tag" {
  description = "Docker image tag for the service-provider"
  type        = string
  default     = "latest"
}

variable "service_provider_host" {
  description = "Hostname for the service-provider application"
  type        = string
}

variable "service_provider_path" {
  description = "Path prefix for the service-provider application"
  type        = string
  default     = "/service-provider"
}

variable "service_provider_resources" {
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
variable "db_connection_pool_size" {
  description = "Database connection pool size"
  type        = number
  default     = 16
}

# Certificate management
variable "cert_issuer_name" {
  description = "The name of the cert-manager ClusterIssuer to use for TLS certificates"
  type        = string
}

# Container registry credentials
variable "ghcr_username" {
  description = "GitHub Container Registry username"
  type        = string
}

variable "ghcr_token" {
  description = "GitHub Container Registry token"
  type        = string
  sensitive   = true
}

variable "ghcr_email" {
  description = "Email associated with GitHub Container Registry account"
  type        = string
}