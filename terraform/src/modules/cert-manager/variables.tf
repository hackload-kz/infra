variable "namespace" {
  description = "Kubernetes namespace for cert-manager"
  type        = string
  default     = "cert-manager"
}

variable "cert_manager_version" {
  description = "Version of cert-manager to install"
  type        = string
  default     = "v1.13.3"
}

variable "create_cluster_issuer" {
  description = "Whether to create a ClusterIssuer"
  type        = bool
  default     = true
}

variable "create_staging_issuer" {
  description = "Whether to create a staging ClusterIssuer for testing"
  type        = bool
  default     = false
}

variable "acme_email" {
  description = "Email address for ACME registration"
  type        = string
}

variable "cluster_issuer_name" {
  description = "Name of the ClusterIssuer"
  type        = string
  default     = "letsencrypt"
}

variable "acme_server" {
  description = "ACME server URL"
  type        = string
  default     = "https://acme-v02.api.letsencrypt.org/directory"
}

variable "acme_staging_server" {
  description = "ACME staging server URL"
  type        = string
  default     = "https://acme-staging-v02.api.letsencrypt.org/directory"
}

variable "resources" {
  description = "Resource limits and requests for cert-manager pods"
  type = object({
    limits = optional(object({
      cpu    = optional(string)
      memory = optional(string)
    }))
    requests = optional(object({
      cpu    = optional(string)
      memory = optional(string)
    }))
  })
  default = {
    limits = {
      cpu    = "100m"
      memory = "128Mi"
    }
    requests = {
      cpu    = "100m"
      memory = "128Mi"
    }
  }
}

variable "node_selector" {
  description = "Node selector for cert-manager pods"
  type        = map(string)
  default     = {}
}

variable "tolerations" {
  description = "Tolerations for cert-manager pods"
  type = list(object({
    key      = optional(string)
    operator = optional(string)
    value    = optional(string)
    effect   = optional(string)
  }))
  default = []
}

variable "affinity" {
  description = "Affinity rules for cert-manager pods"
  type        = any
  default     = {}
}
