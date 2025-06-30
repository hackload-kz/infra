variable "namespace" {
  description = "Kubernetes namespace for the hub application"
  type        = string
  default     = "hub"
}

variable "image" {
  description = "Docker image for the hub application"
  type        = string
  default     = "ghcr.io/hackload-kz/infra"
}

variable "tag" {
  description = "Docker image tag"
  type        = string
  default     = "latest"
}

variable "host" {
  description = "Hostname for the hub application"
  type        = string
}

variable "replicas" {
  description = "Number of replicas for the deployment"
  type        = number
  default     = 2
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8080
}

variable "service_port" {
  description = "Port the service exposes"
  type        = number
  default     = 80
}

variable "resources" {
  description = "Resource limits and requests"
  type = object({
    limits = object({
      cpu    = string
      memory = string
    })
    requests = object({
      cpu    = string
      memory = string
    })
  })
  default = {
    limits = {
      cpu    = "500m"
      memory = "512Mi"
    }
    requests = {
      cpu    = "200m"
      memory = "256Mi"
    }
  }
}

# variable "health_check_path" {
#   description = "Path for health checks"
#   type        = string
#   default     = "/health"
# }

variable "enable_tls" {
  description = "Enable TLS certificate and HTTPS ingress"
  type        = bool
  default     = true
}

variable "cert_issuer_name" {
  description = "Name of the cert-manager ClusterIssuer"
  type        = string
  default     = ""
}

variable "registry_credentials" {
  description = "Registry credentials for pulling images"
  type = object({
    server   = string
    username = string
    password = string
    email    = string
  })
  default   = null
  sensitive = true
}

variable "db_connection_string" {
  type      = string
  sensitive = true
}
