variable "namespace" {
  description = "Namespace where k6 operator will be deployed"
  type        = string
  default     = "k6-operator-system"
}

variable "release_name" {
  description = "Name of the Helm release"
  type        = string
  default     = "k6-operator"
}

variable "chart_version" {
  description = "Version of the k6-operator Helm chart"
  type        = string
  default     = "3.14.1"
}

variable "values_yaml" {
  description = "Additional values to pass to the Helm chart as YAML"
  type        = string
  default     = ""
}

variable "helm_values" {
  description = "Additional values to pass to the Helm chart as key-value pairs"
  type        = map(string)
  default     = {}
}

variable "create_test_service_account" {
  description = "Whether to create a service account for running k6 tests"
  type        = bool
  default     = true
}

variable "watch_namespace" {
  description = "Namespace to watch for TestRun resources (empty for all namespaces)"
  type        = string
  default     = ""
}

variable "enable_leader_election" {
  description = "Enable leader election for the k6 operator"
  type        = bool
  default     = true
}

variable "replicas" {
  description = "Number of replicas for the k6 operator"
  type        = number
  default     = 1
}

variable "resources" {
  description = "Resource limits and requests for the k6 operator"
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
      cpu    = "100m"
      memory = "128Mi"
    }
  }
}