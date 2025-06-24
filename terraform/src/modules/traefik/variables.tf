variable "namespace" {
  description = "Kubernetes namespace for Traefik"
  type        = string
  default     = "traefik-system"
}

variable "traefik_version" {
  description = "Version of Traefik to install"
  type        = string
  default     = "26.0.0"
}

variable "replicas" {
  description = "Number of Traefik replicas"
  type        = number
  default     = 1
}

variable "service_type" {
  description = "Kubernetes service type for Traefik"
  type        = string
  default     = "LoadBalancer"
  
  validation {
    condition     = contains(["ClusterIP", "NodePort", "LoadBalancer"], var.service_type)
    error_message = "Service type must be one of: ClusterIP, NodePort, LoadBalancer."
  }
}

variable "service_annotations" {
  description = "Annotations for the Traefik service"
  type        = map(string)
  default     = {}
}

variable "load_balancer_source_ranges" {
  description = "List of IP CIDR ranges that are allowed to access the load balancer"
  type        = list(string)
  default     = []
}

variable "web_port" {
  description = "Port for HTTP traffic"
  type        = number
  default     = 80
}

variable "websecure_port" {
  description = "Port for HTTPS traffic"
  type        = number
  default     = 443
}

variable "dashboard_port" {
  description = "Port for Traefik dashboard"
  type        = number
  default     = 9000
}

variable "expose_dashboard" {
  description = "Whether to expose the Traefik dashboard port"
  type        = bool
  default     = false
}

variable "enable_dashboard" {
  description = "Enable Traefik dashboard"
  type        = bool
  default     = true
}

variable "dashboard_annotations" {
  description = "Annotations for the dashboard IngressRoute"
  type        = map(string)
  default     = {}
}

variable "dashboard_labels" {
  description = "Labels for the dashboard IngressRoute"
  type        = map(string)
  default     = {}
}

variable "dashboard_host" {
  description = "Host for the Traefik dashboard"
  type        = string
  default     = ""
}

variable "dashboard_tls_enabled" {
  description = "Enable TLS for the dashboard"
  type        = bool
  default     = false
}

variable "dashboard_cert_resolver" {
  description = "Cert resolver for dashboard TLS"
  type        = string
  default     = "letsencrypt"
}

variable "allow_cross_namespace" {
  description = "Allow Traefik to watch resources across namespaces"
  type        = bool
  default     = true
}

variable "allow_external_name_services" {
  description = "Allow ExternalName services"
  type        = bool
  default     = false
}

variable "enable_k8s_ingress" {
  description = "Enable Kubernetes Ingress provider"
  type        = bool
  default     = true
}

variable "global_arguments" {
  description = "Global arguments for Traefik"
  type        = list(string)
  default = [
    "--global.checknewversion",
    "--global.sendanonymoususage"
  ]
}

variable "additional_arguments" {
  description = "Additional arguments for Traefik"
  type        = list(string)
  default     = []
}

variable "env_vars" {
  description = "Environment variables for Traefik"
  type        = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "resources" {
  description = "Resource limits and requests for Traefik pods"
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
      cpu    = "300m"
      memory = "150Mi"
    }
    requests = {
      cpu    = "100m"
      memory = "50Mi"
    }
  }
}

variable "node_selector" {
  description = "Node selector for Traefik pods"
  type        = map(string)
  default     = {}
}

variable "tolerations" {
  description = "Tolerations for Traefik pods"
  type = list(object({
    key      = optional(string)
    operator = optional(string)
    value    = optional(string)
    effect   = optional(string)
  }))
  default = []
}

variable "affinity" {
  description = "Affinity rules for Traefik pods"
  type        = any
  default     = {}
}

variable "security_context" {
  description = "Security context for Traefik container"
  type        = any
  default = {
    capabilities = {
      drop = ["ALL"]
    }
    readOnlyRootFilesystem = true
    runAsGroup             = 65532
    runAsNonRoot           = true
    runAsUser              = 65532
  }
}

variable "pod_security_context" {
  description = "Pod security context for Traefik"
  type        = any
  default = {
    fsGroup = 65532
  }
}

variable "persistence" {
  description = "Persistence configuration for Traefik"
  type = object({
    enabled      = optional(bool, false)
    storageClass = optional(string, "")
    accessMode   = optional(string, "ReadWriteOnce")
    size         = optional(string, "128Mi")
    path         = optional(string, "/data")
  })
  default = {
    enabled = false
  }
}

variable "cert_resolvers" {
  description = "Certificate resolvers configuration"
  type        = any
  default     = {}
}
