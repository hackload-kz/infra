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
