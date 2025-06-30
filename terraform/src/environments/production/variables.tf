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
