# Infrastructure variables
variable "namespace" {
  description = "Kubernetes namespace for all biletter components"
  type        = string
  default     = "biletter"
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

# Biletter specific variables
variable "biletter_image" {
  description = "Docker image for the biletter"
  type        = string
  default     = "ghcr.io/hackload-kz/biletter"
}

variable "biletter_tag" {
  description = "Docker image tag for the biletter"
  type        = string
  default     = "latest"
}

variable "biletter_host" {
  description = "Hostname for the biletter application"
  type        = string
}

variable "biletter_path" {
  description = "Path prefix for the biletter application"
  type        = string
  default     = "/biletter"
}

variable "biletter_resources" {
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