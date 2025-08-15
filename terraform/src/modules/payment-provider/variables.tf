variable "namespace" {
  description = "The Kubernetes namespace to deploy the payment-provider into"
  type        = string
  default     = "payment-provider"
}

variable "image" {
  description = "The Docker image for the payment-provider"
  type        = string
  default     = "ghcr.io/hackload-kz/payment-provider"
}

variable "tag" {
  description = "The Docker image tag for the payment-provider"
  type        = string
  default     = "latest"
}

variable "replicas" {
  description = "Number of replicas for the payment-provider deployment"
  type        = number
  default     = 1
}

variable "container_port" {
  description = "The port the payment-provider container listens on"
  type        = number
  default     = 8080
}

variable "service_port" {
  description = "The port the Kubernetes service exposes"
  type        = number
  default     = 80
}

variable "metrics_port" {
  description = "The port for metrics endpoint"
  type        = number
  default     = 8081
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

# ASP.NET Core configuration
variable "aspnetcore_environment" {
  description = "ASP.NET Core environment"
  type        = string
  default     = "Production"
}

# Database configuration
variable "db_connection_string" {
  description = "Database connection string"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "task"
}

variable "db_user" {
  description = "Database username"
  type        = string
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_host" {
  description = "Database host"
  type        = string
}

variable "db_port" {
  description = "Database port"
  type        = number
  default     = 5432
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
  description = "Database maximum retry delay"
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
  sensitive   = true
}

variable "admin_token" {
  description = "Admin authentication token"
  type        = string
  sensitive   = true
}

variable "admin_key" {
  description = "Admin authentication key"
  type        = string
  default     = ""
  sensitive   = true
}

# API configuration
variable "base_url" {
  description = "Base URL for the API"
  type        = string
}

variable "api_version" {
  description = "API version"
  type        = string
  default     = "v1"
}

# Metrics configuration
variable "enable_metrics" {
  description = "Enable Prometheus metrics"
  type        = bool
  default     = true
}

variable "enable_dashboard" {
  description = "Enable metrics dashboard"
  type        = bool
  default     = true
}

# Traefik routing configuration
variable "host" {
  description = "The hostname for the payment-provider"
  type        = string
}

variable "path_prefix" {
  description = "The path prefix for the payment-provider"
  type        = string
  default     = "/payment-provider"
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