# Hub Module

This module deploys the Hackload Hub application using the `ghcr.io/hackload-kz/infra` image.

## Features

- Kubernetes Deployment with configurable replicas
- ClusterIP Service
- TLS certificate provisioning via cert-manager
- Traefik IngressRoute with HTTPS redirect
- Health checks (liveness and readiness probes)
- Configurable resources and environment variables

## Usage

```hcl
module "hub" {
  source = "../../modules/hub"

  namespace         = "hub"
  image            = "ghcr.io/hackload-kz/infra"
  tag              = "v1.0.0"
  host             = "hub.example.com"
  enable_tls       = true
  cert_issuer_name = "letsencrypt-prod"

  environment_variables = {
    NODE_ENV = "production"
    PORT     = "8080"
  }
}
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| namespace | Kubernetes namespace for the hub application | `string` | `"hub"` | no |
| image | Docker image for the hub application | `string` | `"ghcr.io/hackload-kz/infra"` | no |
| tag | Docker image tag | `string` | `"latest"` | no |
| host | Hostname for the hub application | `string` | n/a | yes |
| replicas | Number of replicas for the deployment | `number` | `2` | no |
| container_port | Port the container listens on | `number` | `8080` | no |
| service_port | Port the service exposes | `number` | `80` | no |
| enable_tls | Enable TLS certificate and HTTPS ingress | `bool` | `true` | no |
| cert_issuer_name | Name of the cert-manager ClusterIssuer | `string` | `""` | no |

## Outputs

| Name | Description |
|------|-------------|
| namespace | Namespace where the hub application is deployed |
| service_name | Name of the hub service |
| deployment_name | Name of the hub deployment |
| url | URL for the hub application |
| image_full | Full image name with tag |
