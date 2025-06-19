variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
}

variable "master_count" {
  description = "Number of master nodes"
  type        = number
  default     = 3
}

variable "node_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 1
}

variable "keypair_name" {
  description = "Name of the keypair"
  type        = string
}

variable "public_key_path" {
  description = "Path to public SSH key"
  type        = string
}

variable "template_name" {
  description = "Name of the cluster template"
  type        = string
  default     = "cluster-template"
}

variable "flavor" {
  description = "Flavor for worker nodes"
  type        = string
  default     = "d1.ram8cpu4"
}

variable "master_flavor" {
  description = "Flavor for master nodes"
  type        = string
  default     = "d1.ram8cpu4"
}

variable "image" {
  description = "Operating system image for the cluster template"
  type        = string
  default     = "Fedora-CoreOS-37-x86_64-202304"
}

variable "kube_version" {
  description = "Kubernetes version for the cluster"
  type        = string
  default     = "v1.23.8"
}
