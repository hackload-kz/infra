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

variable "hub_auth_trust_host" {
  description = "AUTH_TRUST_HOST for NextAuth.js"
  type        = string
  default     = "true"
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
