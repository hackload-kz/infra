# Traefik Terraform Module

This Terraform module installs Traefik as an ingress controller on a Kubernetes cluster using Helm. Traefik is a modern reverse proxy and load balancer that integrates seamlessly with Kubernetes.

## Features

- Installs Traefik using the official Helm chart
- Creates a dedicated namespace for Traefik
- Configurable service type (LoadBalancer, NodePort, ClusterIP)
- Optional dashboard with secure access
- Support for HTTP/HTTPS traffic routing
- Integration with cert-manager for automatic TLS certificates
- Customizable resource limits, node selectors, tolerations, and affinity rules
- Support for certificate resolvers (Let's Encrypt)

## Usage

### Basic Usage

```hcl
module "traefik" {
  source = "./modules/traefik"
  
  service_type = "LoadBalancer"
}
```

### Advanced Usage with Dashboard and TLS

```hcl
module "traefik" {
  source = "./modules/traefik"
  
  # Service configuration
  service_type = "LoadBalancer"
  service_annotations = {
    "service.beta.kubernetes.io/aws-load-balancer-type" = "nlb"
  }
  
  # Dashboard configuration
  enable_dashboard        = true
  dashboard_host          = "traefik.example.com"
  dashboard_tls_enabled   = true
  dashboard_cert_resolver = "letsencrypt"
  
  # Certificate resolvers
  cert_resolvers = {
    letsencrypt = {
      acme = {
        email   = "admin@example.com"
        storage = "/data/acme.json"
        httpChallenge = {
          entryPoint = "web"
        }
      }
    }
  }
  
  # Resource configuration
  resources = {
    limits = {
      cpu    = "500m"
      memory = "256Mi"
    }
    requests = {
      cpu    = "200m"
      memory = "128Mi"
    }
  }
  
  # High availability
  replicas = 3
  
  # Node placement
  node_selector = {
    "node-role" = "ingress"
  }
}
```

## Creating IngressRoutes

After deploying Traefik, you can create IngressRoute resources to route traffic:

```yaml
apiVersion: traefik.containo.us/v1alpha1
kind: IngressRoute
metadata:
  name: example-app
  namespace: default
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`app.example.com`)
      kind: Rule
      services:
        - name: example-service
          port: 80
  tls:
    certResolver: letsencrypt
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
| namespace | Kubernetes namespace for Traefik | `string` | `"traefik-system"` | no |
| traefik_version | Version of Traefik to install | `string` | `"26.0.0"` | no |
| replicas | Number of Traefik replicas | `number` | `1` | no |
| service_type | Kubernetes service type | `string` | `"LoadBalancer"` | no |
| service_annotations | Annotations for the Traefik service | `map(string)` | `{}` | no |
| enable_dashboard | Enable Traefik dashboard | `bool` | `true` | no |
| dashboard_host | Host for the Traefik dashboard | `string` | `""` | no |
| dashboard_tls_enabled | Enable TLS for the dashboard | `bool` | `false` | no |
| dashboard_cert_resolver | Cert resolver for dashboard TLS | `string` | `"letsencrypt"` | no |
| cert_resolvers | Certificate resolvers configuration | `any` | `{}` | no |
| resources | Resource limits and requests | `object` | See variables.tf | no |
| node_selector | Node selector for pods | `map(string)` | `{}` | no |
| tolerations | Tolerations for pods | `list(object)` | `[]` | no |
| affinity | Affinity rules for pods | `any` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| namespace | The namespace where Traefik is installed |
| helm_release_name | The name of the Traefik Helm release |
| helm_release_version | The version of the Traefik Helm release |
| service_name | The name of the Traefik service |
| service_namespace | The namespace of the Traefik service |
| dashboard_url | URL for the Traefik dashboard |
| web_port | HTTP port for Traefik |
| websecure_port | HTTPS port for Traefik |
| load_balancer_ip | Load balancer IP (if applicable) |

## Integration with cert-manager

This module works seamlessly with cert-manager for automatic TLS certificate provisioning. Configure certificate resolvers to use ACME providers like Let's Encrypt:

```hcl
cert_resolvers = {
  letsencrypt = {
    acme = {
      email   = "admin@example.com"
      storage = "/data/acme.json"
      httpChallenge = {
        entryPoint = "web"
      }
    }
  }
  letsencrypt-staging = {
    acme = {
      email   = "admin@example.com"
      storage = "/data/acme-staging.json"
      server  = "https://acme-staging-v02.api.letsencrypt.org/directory"
      httpChallenge = {
        entryPoint = "web"
      }
    }
  }
}
```

## Notes

- The module creates CRDs for IngressRoute, IngressRouteTCP, IngressRouteUDP, Middleware, etc.
- For production deployments, consider using multiple replicas for high availability
- When using LoadBalancer service type, ensure your cloud provider supports it
- The dashboard should be secured in production environments
- HTTP-01 challenge requires port 80 to be accessible for certificate validation
