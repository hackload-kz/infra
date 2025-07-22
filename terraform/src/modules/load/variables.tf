variable "namespace" {
  description = "Kubernetes namespace for the load application"
  type        = string
  default     = "load"
}

variable "image" {
  description = "Container image for the load application"
  type        = string
}

variable "tag" {
  description = "Container image tag"
  type        = string
  default     = "latest"
}

variable "replicas" {
  description = "Number of replicas for the load application"
  type        = number
  default     = 1
}

variable "host" {
  description = "Hostname for the load application"
  type        = string
}

variable "path_prefix" {
  description = "Path prefix for the load application"
  type        = string
  default     = "/load"
}

variable "enable_tls" {
  description = "Enable TLS for the load application"
  type        = bool
  default     = true
}

variable "cert_issuer_name" {
  description = "Name of the cert-manager cluster issuer"
  type        = string
  default     = "letsencrypt-prod"
}

variable "container_port" {
  description = "Container port for the load application"
  type        = number
  default     = 8080
}

variable "service_port" {
  description = "Service port for the load application"
  type        = number
  default     = 80
}

variable "resources" {
  description = "Resource limits and requests for the load application"
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
      cpu    = "200m"
      memory = "256Mi"
    }
    requests = {
      cpu    = "100m"
      memory = "128Mi"
    }
  }
}

variable "registry_credentials" {
  description = "Container registry credentials"
  type = object({
    server   = string
    username = string
    password = string
    email    = string
  })
  sensitive = true
}

variable "nextauth_url" {
  description = "NextAuth URL for the load application"
  type        = string
}

variable "nextauth_secret" {
  description = "NextAuth secret for JWT signing"
  type        = string
  sensitive   = true
}

variable "load_username" {
  description = "Username for load testing app authentication"
  type        = string
  sensitive   = true
}

variable "load_password" {
  description = "Password for load testing app authentication"
  type        = string
  sensitive   = true
}

variable "k6_namespace" {
  description = "Kubernetes namespace where k6 tests will be created"
  type        = string
  default     = "k6-system"
}