terraform {
  required_version = ">= 1.8.1"
  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "=2.3.3"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "=2.12.1"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "=2.26.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "=3.2.2"
    }
    random = {
      source  = "hashicorp/random"
      version = "=3.6.0"
    }
    # openstack = {
    #   source  = "terraform-provider-openstack/openstack"
    #   version = "=2.1.0"
    # }
  }
}
