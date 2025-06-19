output "cluster_id" {
  description = "ID of the created cluster"
  value       = openstack_containerinfra_cluster_v1.kubernetes_cluster.id
}

output "cluster_api_address" {
  description = "API address of the cluster"
  value       = openstack_containerinfra_cluster_v1.kubernetes_cluster.api_address
}

output "cluster_master_addresses" {
  description = "Master node addresses"
  value       = openstack_containerinfra_cluster_v1.kubernetes_cluster.master_addresses
}

output "cluster_node_addresses" {
  description = "Worker node addresses"
  value       = openstack_containerinfra_cluster_v1.kubernetes_cluster.node_addresses
}
