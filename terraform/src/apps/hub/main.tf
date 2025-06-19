provider "kubernetes" {
  config_path = "./kubeconfig"
}

provider "helm" {
  kubernetes {
    config_path = "./kubeconfig"
  }
}

module "cnpg_operator" {
  source = "../../modules/cnpg-operator"
}

module "cnpg_cluster" {
  source             = "../../modules/cnpg-cluster"
  storage_class      = var.storage_class
  storage_size       = var.cnpg_storage_size
  backup_destination = var.cnpg_backup_destination
  username           = "hackload"
  backup_retention   = var.cnpg_backup_retention
}

module "cert_manager" {
  source = "../../modules/cert-manager"

  create_cluster_issuer = true
  acme_email            = var.acme_email
}

# provider "openstack" {
#   auth_url    = var.openstack_auth_url
#   region      = var.openstack_region
#   tenant_name = var.openstack_tenant_name
#   user_name   = var.openstack_user_name
#   password    = var.openstack_password
# }

# module "kubernetes" {
#   source = "../../modules/kubernetes"

#   cluster_name    = "hackload-production"
#   master_count    = 3
#   node_count      = 2
#   keypair_name    = "terraform-cluster-keypair"
#   public_key_path = "~/.ssh/ps.pub"
#   template_name   = "hackload-cluster-template"
#   master_flavor   = "d1.ram12cpu4"
#   flavor          = "d1.ram12cpu4"
#   image           = "Fedora-CoreOS-37-x86_64-202304"
# }

# # Output cluster information
# output "cluster_id" {
#   description = "ID of the created cluster"
#   value       = module.kubernetes.cluster_id
# }

# output "cluster_api_address" {
#   description = "API address of the cluster"
#   value       = module.kubernetes.cluster_api_address
# }

# output "cluster_master_addresses" {
#   description = "Master node addresses"
#   value       = module.kubernetes.cluster_master_addresses
# }

# output "cluster_node_addresses" {
#   description = "Worker node addresses"
#   value       = module.kubernetes.cluster_node_addresses
# }
