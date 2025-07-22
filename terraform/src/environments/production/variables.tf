variable "ghcr_username" {
  type      = string
  sensitive = true
}

variable "ghcr_token" {
  type      = string
  sensitive = true
}

variable "ghcr_email" {
  type      = string
  sensitive = true
}

variable "hub_db_connection_string" {
  type      = string
  sensitive = true
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

variable "telemetry_grafana_admin_password" {
  description = "Admin password for Grafana"
  type        = string
  sensitive   = true
  default     = "admin123"
}

variable "load_nextauth_secret" {
  description = "NextAuth secret for JWT signing in load app"
  type        = string
  sensitive   = true
}

variable "load_admin_users" {
  description = "Comma-separated list of admin users who can access the load testing app"
  type        = string
  sensitive   = true
}

