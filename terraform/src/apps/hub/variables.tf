variable "acme_email" {
  type = string
}

variable "storage_class" {
  type = string
}

variable "cnpg_storage_size" {
  type = string
}

variable "cnpg_backup_destination" {
  type = string
}

variable "cnpg_backup_retention" {
  type = string
}

variable "traefik_service_type" {
  description = "Service type for Traefik (LoadBalancer, NodePort, ClusterIP)"
  type        = string
  default     = "LoadBalancer"
}

variable "traefik_enable_dashboard" {
  description = "Enable Traefik dashboard"
  type        = bool
  default     = true
}

variable "traefik_dashboard_host" {
  description = "Host for Traefik dashboard"
  type        = string
  default     = ""
}

variable "traefik_dashboard_tls_enabled" {
  description = "Enable TLS for Traefik dashboard"
  type        = bool
  default     = false
}

variable "hub_image_tag" {
  description = "Docker image tag for the hub application"
  type        = string
  default     = "latest"
}

variable "hub_host" {
  description = "Hostname for the hub application"
  type        = string
}

variable "hub_replicas" {
  description = "Number of replicas for the hub deployment"
  type        = number
  default     = 2
}

variable "hub_environment_variables" {
  description = "Environment variables for the hub application"
  type        = map(string)
  default     = {}
}

variable "hub_db_connection_string" {
  type      = string
  sensitive = true
}

variable "ghcr_username" {
  description = "GitHub Container Registry username"
  type        = string
  sensitive   = true
}

variable "ghcr_token" {
  description = "GitHub Container Registry token/password"
  type        = string
  sensitive   = true
}

variable "ghcr_email" {
  description = "Email for GitHub Container Registry"
  type        = string
  default     = ""
}

variable "hub_nextauth_url" {
  description = "NextAuth URL for the hub application"
  type        = string
}

variable "hub_nextauth_secret" {
  description = "NextAuth secret for JWT signing"
  type        = string
  sensitive   = true
}

variable "hub_google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  sensitive   = true
}

variable "hub_google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}

variable "hub_github_client_id" {
  description = "GitHub OAuth client ID"
  type        = string
  sensitive   = true
}

variable "hub_github_client_secret" {
  description = "GitHub OAuth client secret"
  type        = string
  sensitive   = true
}

variable "hub_admin_users" {
  description = "Comma-separated list of admin users"
  type        = string
  sensitive   = true
}

# Telemetry variables
variable "telemetry_enabled" {
  description = "Enable telemetry with Prometheus and Grafana"
  type        = bool
  default     = true
}

variable "telemetry_prometheus_host" {
  description = "Hostname for Prometheus UI"
  type        = string
  default     = "prometheus.hackload.kz"
}

variable "telemetry_grafana_host" {
  description = "Hostname for Grafana UI"
  type        = string
  default     = "grafana.hackload.kz"
}

variable "telemetry_alertmanager_host" {
  description = "Hostname for Alertmanager UI"
  type        = string
  default     = "alertmanager.hackload.kz"
}

variable "telemetry_grafana_admin_password" {
  description = "Admin password for Grafana"
  type        = string
  sensitive   = true
  default     = "admin123"
}

variable "telemetry_prometheus_storage_size" {
  description = "Storage size for Prometheus data"
  type        = string
  default     = "10Gi"
}

variable "telemetry_alertmanager_storage_size" {
  description = "Storage size for Alertmanager data"
  type        = string
  default     = "2Gi"
}

variable "telemetry_grafana_storage_size" {
  description = "Storage size for Grafana data"
  type        = string
  default     = "10Gi"
}

# Load testing application variables
variable "load_enabled" {
  description = "Enable load testing application"
  type        = bool
  default     = true
}

variable "load_image_tag" {
  description = "Docker image tag for the load application"
  type        = string
  default     = "latest"
}

variable "load_replicas" {
  description = "Number of replicas for the load deployment"
  type        = number
  default     = 1
}

variable "load_nextauth_secret" {
  description = "NextAuth secret for JWT signing in load app"
  type        = string
  sensitive   = true
  default     = ""
}

variable "load_username" {
  description = "Username for load testing app authentication"
  type        = string
  sensitive   = true
  default     = ""
}

variable "load_password" {
  description = "Password for load testing app authentication"
  type        = string
  sensitive   = true
  default     = ""
}

# variable "openstack_auth_url" {
#   description = "OpenStack authentication URL"
#   type        = string
# }

# variable "openstack_region" {
#   description = "OpenStack region"
#   type        = string
# }

# variable "openstack_tenant_name" {
#   description = "OpenStack tenant name"
#   type        = string
# }

# variable "openstack_user_name" {
#   description = "OpenStack username"
#   type        = string
# }

# variable "openstack_password" {
#   description = "OpenStack password"
#   type        = string
#   sensitive   = true
# }
