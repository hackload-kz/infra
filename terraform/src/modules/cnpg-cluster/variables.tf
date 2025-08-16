variable "namespace" {
  type    = string
  default = "cnpg-cluster"
}

variable "storage_class" {
  type = string
}

variable "storage_size" {
  type = string
}

variable "instances" {
  type    = number
  default = 2
}

variable "backup_schedule" {
  type    = string
  default = "0 0 0 * * *"
}

variable "backup_retention" {
  description = "Backup retention policy. Set to null to disable backups."
  type        = string
  default     = null
}

variable "backup_destination" {
  description = "Backup destination path. Set to null to disable backups."
  type        = string
  default     = null
}

variable "username" {
  type = string
}

variable "expose_external" {
  description = "Whether to expose PostgreSQL externally via Traefik"
  type        = bool
  default     = false
}

variable "external_host" {
  description = "External hostname for PostgreSQL access"
  type        = string
  default     = ""
}

variable "external_port" {
  description = "External port for PostgreSQL access"
  type        = number
}

variable "enable_metrics" {
  description = "Enable PostgreSQL metrics collection"
  type        = bool
  default     = false
}
