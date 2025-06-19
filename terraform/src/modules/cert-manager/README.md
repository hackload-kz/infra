# Cert-Manager Terraform Module

This Terraform module installs cert-manager on a Kubernetes cluster using Helm and optionally creates ClusterIssuer resources for automatic TLS certificate management.

## Features

- Installs cert-manager using the official Helm chart
- Creates a dedicated namespace for cert-manager
- Optionally creates ClusterIssuer for Let's Encrypt production certificates
- Optionally creates ClusterIssuer for Let's Encrypt staging certificates (for testing)
- Configurable resource limits, node selectors, tolerations, and affinity rules
- Support for custom ACME servers

## Usage

### Basic Usage

```hcl
module "cert_manager" {
  source = "./modules/cert-manager"
  
  acme_email = "admin@example.com"
}
```

### Advanced Usage

```hcl
module "cert_manager" {
  source = "./modules/cert-manager"
  
  # Required
  acme_email = "admin@example.com"
  
  # Optional configuration
  namespace                = "cert-manager"
  cert_manager_version     = "v1.13.3"
  create_cluster_issuer    = true
  create_staging_issuer    = true
  cluster_issuer_name      = "letsencrypt"
  
  # Resource configuration
  resources = {
    limits = {
      cpu    = "200m"
      memory = "256Mi"
    }
    requests = {
      cpu    = "100m"
      memory = "128Mi"
    }
  }
  
  # Node placement
  node_selector = {
    "node-type" = "system"
  }
  
  tolerations = [
    {
      key      = "system"
      operator = "Equal"
      value    = "true"
      effect   = "NoSchedule"
    }
  ]
}
```

## Using the ClusterIssuer

Once the module is deployed, you can use the ClusterIssuer in your Ingress resources:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt"
spec:
  tls:
  - hosts:
    - example.com
    secretName: example-tls
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: example-service
            port:
              number: 80
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| kubernetes | >= 2.0 |
| helm | >= 2.0 |

## Providers

| Name | Version |
|------|---------|
| kubernetes | >= 2.0 |
| helm | >= 2.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| acme_email | Email address for ACME registration | `string` | n/a | yes |
| namespace | Kubernetes namespace for cert-manager | `string` | `"cert-manager"` | no |
| cert_manager_version | Version of cert-manager to install | `string` | `"v1.13.3"` | no |
| create_cluster_issuer | Whether to create a ClusterIssuer | `bool` | `true` | no |
| create_staging_issuer | Whether to create a staging ClusterIssuer for testing | `bool` | `false` | no |
| cluster_issuer_name | Name of the ClusterIssuer | `string` | `"letsencrypt"` | no |
| acme_server | ACME server URL | `string` | `"https://acme-v02.api.letsencrypt.org/directory"` | no |
| acme_staging_server | ACME staging server URL | `string` | `"https://acme-staging-v02.api.letsencrypt.org/directory"` | no |
| resources | Resource limits and requests for cert-manager pods | `object` | See variables.tf | no |
| node_selector | Node selector for cert-manager pods | `map(string)` | `{}` | no |
| tolerations | Tolerations for cert-manager pods | `list(object)` | `[]` | no |
| affinity | Affinity rules for cert-manager pods | `any` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| namespace | The namespace where cert-manager is installed |
| helm_release_name | The name of the cert-manager Helm release |
| helm_release_version | The version of the cert-manager Helm release |
| cluster_issuer_name | The name of the created ClusterIssuer |
| cluster_issuer_staging_name | The name of the created staging ClusterIssuer |

## Notes

- The module creates ClusterIssuer resources that use HTTP-01 challenge with Traefik ingress class
- For production use, ensure your ingress controller is properly configured to handle ACME challenges
- Use the staging issuer first to test your setup and avoid hitting Let's Encrypt rate limits
- The module assumes you're using Traefik as your ingress controller; modify the template if using a different controller
