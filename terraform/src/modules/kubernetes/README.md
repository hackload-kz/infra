# Kubernetes Module

This module creates an OpenStack Magnum Kubernetes cluster with the following components:

- SSH keypair for cluster access
- Cluster template with Fedora CoreOS and Kubernetes
- Kubernetes cluster instance

## Usage

```hcl
module "kubernetes" {
  source = "../../modules/kubernetes"
  
  cluster_name      = "my-cluster"
  master_count      = 3
  node_count        = 2
  keypair_name      = "my-keypair"
  public_key_path   = "~/.ssh/id_rsa.pub"
  template_name     = "custom_k8s"
  flavor            = "d1.ram8cpu4"
  master_flavor     = "d1.ram8cpu4"
  image             = "Fedora-CoreOS-37-x86_64-202304"
  kube_version      = "v1.23.8"
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| cluster_name | Name of the Kubernetes cluster | `string` | n/a | yes |
| master_count | Number of master nodes | `number` | `3` | no |
| node_count | Number of worker nodes | `number` | `1` | no |
| keypair_name | Name of the keypair | `string` | n/a | yes |
| public_key_path | Path to public SSH key | `string` | n/a | yes |
| template_name | Name of the cluster template | `string` | `"cluster-template"` | no |
| flavor | Flavor for worker nodes | `string` | `"d1.ram8cpu4"` | no |
| master_flavor | Flavor for master nodes | `string` | `"d1.ram8cpu4"` | no |
| image | Operating system image for the cluster template | `string` | `"Fedora-CoreOS-37-x86_64-202304"` | no |
| kube_version | Kubernetes version for the cluster | `string` | `"v1.23.8"` | no |

## Outputs

| Name | Description |
|------|-------------|
| cluster_id | ID of the created cluster |
| cluster_api_address | API address of the cluster |
| cluster_master_addresses | Master node addresses |
| cluster_node_addresses | Worker node addresses |
