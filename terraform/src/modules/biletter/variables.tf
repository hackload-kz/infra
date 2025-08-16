variable "namespace" {
  description = "The Kubernetes namespace to deploy the biletter into"
  type        = string
  default     = "biletter"
}

variable "image" {
  description = "The Docker image for the biletter"
  type        = string
  default     = "ghcr.io/hackload-kz/biletter"
}

variable "tag" {
  description = "The Docker image tag for the biletter"
  type        = string
  default     = "latest"
}

variable "replicas" {
  description = "Number of replicas for the biletter deployment"
  type        = number
  default     = 1
}

variable "container_port" {
  description = "The port the biletter container listens on"
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
  description = "Resource requests and limits for the biletter container"
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

# Database configuration - the 3 required env vars
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

# Traefik routing configuration
variable "host" {
  description = "The hostname for the biletter"
  type        = string
}

variable "path_prefix" {
  description = "The path prefix for the biletter"
  type        = string
  default     = "/biletter"
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