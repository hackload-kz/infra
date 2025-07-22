# Load Testing Application Module

This module deploys a Next.js load testing application that integrates with the k6 operator to create and manage load tests.

## Features

- **Web Interface**: Simple UI for starting load tests with URL input
- **Authentication**: OAuth integration with Google and GitHub
- **Admin-only Access**: Restricted access via environment variable configuration
- **k6 Integration**: Creates k6 test resources via Kubernetes API
- **Minimal Permissions**: Service account with restricted RBAC for k6 operations only
- **Path-based Routing**: Configurable path prefix for deployment alongside other applications
- **TLS Support**: Automatic certificate management with cert-manager

## Architecture

The application consists of:
- Next.js frontend with authentication
- API endpoints for k6 test creation
- Service account with minimal k6-only permissions
- Traefik IngressRoute for external access

## Security

The application implements several security measures:
- OAuth-only authentication (no local accounts)
- Admin user whitelist via environment variable
- Service account with minimal permissions (k6 operations only)
- No cluster-admin or broad Kubernetes permissions

## Usage

```hcl
module "load_app" {
  source = "../../modules/load"

  # Basic configuration
  namespace = "load"
  image     = "ghcr.io/hackload-kz/load-app"
  tag       = "latest"
  host      = "hub.hackload.kz"
  path_prefix = "/load"

  # OAuth configuration
  nextauth_url          = "https://hub.hackload.kz/load"
  nextauth_secret       = var.load_nextauth_secret
  google_client_id      = var.google_client_id
  google_client_secret  = var.google_client_secret
  github_client_id      = var.github_client_id
  github_client_secret  = var.github_client_secret

  # Admin access
  admin_users = "admin@example.com,user2@example.com"

  # k6 configuration
  k6_namespace = "k6-system"

  # Container registry
  registry_credentials = {
    server   = "ghcr.io"
    username = var.ghcr_username
    password = var.ghcr_token
    email    = var.ghcr_email
  }

  # TLS
  enable_tls        = true
  cert_issuer_name  = "letsencrypt-prod"
}
```

## Load Test Configuration

The application creates k6 tests with the following fixed configuration:
- **Virtual Users**: 100
- **Duration**: 5 minutes
- **Ramp-up**: 30 seconds
- **Ramp-down**: 30 seconds

## RBAC Permissions

The service account has minimal permissions:
- `k6.io/k6s`: create, get, list, watch
- `core/configmaps`: create, get (for k6 scripts)

## Dependencies

- k6 operator must be installed in the cluster
- cert-manager (for TLS certificates)
- Traefik (for ingress)
- OAuth applications configured for Google and GitHub

## Environment Variables

Required environment variables for the application:
- `NEXTAUTH_URL`: Base URL for NextAuth
- `NEXTAUTH_SECRET`: Secret for JWT signing
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GITHUB_CLIENT_ID`: GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth client secret
- `ADMIN_USERS`: Comma-separated list of admin email addresses
- `K6_NAMESPACE`: Kubernetes namespace for k6 tests (default: k6-system)