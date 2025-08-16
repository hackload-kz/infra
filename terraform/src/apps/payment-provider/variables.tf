# Infrastructure variables
variable "namespace" {
  description = "Kubernetes namespace for all payment-provider components"
  type        = string
  default     = "payment-provider"
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
  description = "Enable metrics collection for PostgreSQL"
  type        = bool
  default     = false
}

# Payment Provider specific variables
variable "payment_provider_image" {
  description = "Docker image for the payment-provider"
  type        = string
  default     = "ghcr.io/hackload-kz/payment-provider"
}

variable "payment_provider_tag" {
  description = "Docker image tag for the payment-provider"
  type        = string
  default     = "latest"
}

variable "payment_provider_host" {
  description = "Hostname for the payment-provider application"
  type        = string
}

variable "payment_provider_path" {
  description = "Path prefix for the payment-provider application"
  type        = string
  default     = "/payment-provider"
}

variable "payment_provider_resources" {
  description = "Resource requests and limits for the payment-provider container"
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
variable "db_name" {
  description = "Database name"
  type        = string
  default     = "task"
}

variable "db_pool_size" {
  description = "Database connection pool size"
  type        = number
  default     = 20
}

variable "db_max_retry_count" {
  description = "Database maximum retry count"
  type        = number
  default     = 3
}

variable "db_max_retry_delay" {
  description = "Database maximum retry delay (in seconds)"
  type        = string
  default     = "00:00:30"
}

variable "db_command_timeout" {
  description = "Database command timeout (in seconds)"
  type        = number
  default     = 60
}

# Security configuration
variable "csrf_key" {
  description = "CSRF protection key"
  type        = string
  default     = "hackload-payment-gateway-csrf-key-2025"
  sensitive   = true
}

variable "admin_token" {
  description = "Admin authentication token"
  type        = string
  default     = "admin_token_2025_hackload_payment_gateway_secure_key_dev_only"
  sensitive   = true
}

variable "admin_key" {
  description = "Admin authentication key (alias for admin_token)"
  type        = string
  default     = ""
  sensitive   = true
}

# API configuration
variable "base_url" {
  description = "Base URL for the API"
  type        = string
  default     = "http://localhost:7010"
}

variable "api_version" {
  description = "API version"
  type        = string
  default     = "v1"
}

# Metrics configuration
variable "metrics_port" {
  description = "Port for metrics endpoint"
  type        = number
  default     = 8081
}

variable "enable_dashboard" {
  description = "Enable metrics dashboard"
  type        = bool
  default     = true
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