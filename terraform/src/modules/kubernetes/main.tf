terraform {
  required_providers {
    openstack = {
      source  = "terraform-provider-openstack/openstack"
      version = "~> 2.1.0"
    }
  }
}

resource "openstack_compute_keypair_v2" "cluster_keypair" {
  name       = var.keypair_name
  public_key = file(var.public_key_path)
}

resource "openstack_networking_network_v2" "cluster_network" {
  name           = "${var.cluster_name}-network"
  admin_state_up = "true"
}

resource "openstack_networking_subnet_v2" "cluster_subnet" {
  name            = "${var.cluster_name}-subnet"
  network_id      = openstack_networking_network_v2.cluster_network.id
  cidr            = "10.0.1.0/24"
  ip_version      = 4
  dns_nameservers = ["8.8.8.8", "8.8.4.4"]
}

resource "openstack_networking_router_v2" "cluster_router" {
  name                = "${var.cluster_name}-router"
  external_network_id = "83554642-6df5-4c7a-bf55-21bc74496109"
}

resource "openstack_networking_router_interface_v2" "cluster_router_interface" {
  router_id = openstack_networking_router_v2.cluster_router.id
  subnet_id = openstack_networking_subnet_v2.cluster_subnet.id
}

resource "openstack_containerinfra_clustertemplate_v1" "cluster_template" {
  name                  = var.template_name
  image                 = var.image
  coe                   = "kubernetes"
  flavor                = var.flavor
  master_flavor         = var.master_flavor
  dns_nameserver        = "8.8.8.8"
  docker_storage_driver = "overlay2"
  docker_volume_size    = 100
  volume_driver         = "cinder"
  network_driver        = "calico"
  server_type           = "vm"
  master_lb_enabled     = true
  floating_ip_enabled   = false
  apiserver_port        = 6443
  cluster_distro        = "fedora-coreos"
  external_network_id   = "83554642-6df5-4c7a-bf55-21bc74496109"
  fixed_network         = openstack_networking_network_v2.cluster_network.id
  fixed_subnet          = openstack_networking_subnet_v2.cluster_subnet.id
  keypair_id            = openstack_compute_keypair_v2.cluster_keypair.id
  labels = {
    boot_volume_size              = 30
    boot_volume_type              = "ceph-ssd"
    docker_volume_type            = "ceph-ssd"
    container_infra_prefix        = "registry.pscloud.io/pscloudmagnum/"
    hyperkube_prefix              = "registry.pscloud.io/pscloudmagnum/"
    kube_version                  = var.kube_version
    kube_tag                      = var.kube_version
    kube_dashboard_enabled        = "true"
    coredns_tag                   = "1.9.3"
    etcd_tag                      = "v3.5.4"
    cinder_csi_plugin_tag         = "v1.23.4"
    csi_attacher_tag              = "v3.1.0"
    csi_provisioner_tag           = "v2.1.2"
    csi_snapshotter_tag           = "v4.0.0"
    csi_resizer_tag               = "v1.1.0"
    csi_node_driver_registrar_tag = "v2.1.0"
    k8s_keystone_auth_tag         = "v1.23.0"
    autoscaler_tag                = "v1.22.0"
    ingress_controller            = "nginx"
    helm_client_url               = "https://get.helm.sh/helm-v3.3.0-linux-amd64.tar.gz"
    helm_client_sha256            = "ff4ac230b73a15d66770a65a037b07e08ccbce6833fbd03a5b84f06464efea45"
    helm_client_tag               = "v3.3.0"
    container_runtime             = "containerd"
    containerd_version            = "1.5.3"
    containerd_tarball_sha256     = "32a9bf1b7ab2adbd9d2a16b17bf1aa6e61592938655adfb5114c40d527aa9be7"
    auto_healing_enabled          = "true"
    auto_healing_controller       = "draino"
    npd_enabled                   = "true"
    auto_scaling_enabled          = "true"
    cgroup_driver                 = "systemd"
    master_lb_enabled             = "true"
    master_lb_floating_ip_enabled = "true"
  }
}

resource "openstack_containerinfra_cluster_v1" "kubernetes_cluster" {
  name                = var.cluster_name
  cluster_template_id = openstack_containerinfra_clustertemplate_v1.cluster_template.id
  master_count        = var.master_count
  node_count          = var.node_count
  keypair             = openstack_compute_keypair_v2.cluster_keypair.name
}
