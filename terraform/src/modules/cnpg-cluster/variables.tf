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
  type    = string
  default = "7d"
}

variable "backup_destination" {
  type = string
}

variable "username" {
  type = string
}
